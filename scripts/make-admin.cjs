#!/usr/bin/env node

/**
 * Veyro Admin Account Promotion Utility
 *
 * Promotes a Firebase Auth user to ADMIN in Cloud Firestore (veyrodatabase).
 *
 * Usage:
 *   node scripts/make-admin.cjs <email-or-uid>
 *   node scripts/make-admin.cjs --list
 *   pnpm admin:promote <email-or-uid>
 */

const path = require('path');
const fs = require('fs');

// Ensure firebase-admin and other monorepo dependencies can be resolved
module.paths.push(
  path.resolve(__dirname, '../apps/api/node_modules'),
  path.resolve(__dirname, '../node_modules/.pnpm/firebase-admin@12.7.0/node_modules')
);

// Load environment variables from apps/api/.env or root .env
const envPaths = [
  path.resolve(__dirname, '../apps/api/.env'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const dotenv = require('dotenv');
    dotenv.config({ path: envPath });
  }
}

const { initializeApp, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.FIREBASE_PROJECT_ID || 'veyro-ffccc';
const databaseId = process.env.FIRESTORE_DATABASE_ID || 'veyrodatabase';

const app = getApps().length > 0 ? getApps()[0] : initializeApp({ projectId });
const auth = getAuth(app);
const db = getFirestore(app, databaseId);

async function findUser(identifier) {
  if (identifier.includes('@')) {
    try {
      return await auth.getUserByEmail(identifier);
    } catch (err) {
      if (err.code === 'auth/user-not-found') return null;
      throw err;
    }
  }
  try {
    return await auth.getUser(identifier);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      try {
        return await auth.getUserByEmail(identifier);
      } catch {
        return null;
      }
    }
    throw err;
  }
}

async function listUsers() {
  console.log(`\n🔍 Fetching users from Firebase Auth (Project: ${projectId})...\n`);
  const list = await auth.listUsers(50);
  if (list.users.length === 0) {
    console.log('No users found in Firebase Authentication.');
    return;
  }

  console.log(`Found ${list.users.length} user(s):\n`);
  for (const u of list.users) {
    const userDoc = await db.collection('users').doc(u.uid).get();
    const data = userDoc.data() || {};
    const role = data.role || 'NONE';
    const roles = Array.isArray(data.roles) ? data.roles.join(', ') : 'none';
    const isAdmin = roles.includes('ADMIN') || role === 'ADMIN';

    console.log(` • ${u.email || 'No Email'} (${u.displayName || 'No Name'})`);
    console.log(`   UID:   ${u.uid}`);
    console.log(`   Roles: [${roles}] (Active: ${role}) ${isAdmin ? '👑 ADMIN' : ''}`);
    console.log('');
  }
}

async function promoteToAdmin(identifier) {
  const user = await findUser(identifier);
  if (!user) {
    console.error(`\n❌ Error: User not found in Firebase Authentication: "${identifier}"`);
    console.error(`   Please sign up first at http://localhost:3000/auth/admin or http://localhost:3000/auth\n`);
    process.exit(1);
  }

  console.log(`\n👤 User found: ${user.email || 'No email'} (UID: ${user.uid})`);
  console.log(`   Display Name: ${user.displayName || 'None'}`);

  const userRef = db.collection('users').doc(user.uid);
  const userDoc = await userRef.get();
  const existing = userDoc.data() || {};

  const existingRoles = Array.isArray(existing.roles) ? existing.roles : [];
  const updatedRoles = Array.from(new Set([...existingRoles, 'ADMIN']));
  const now = new Date().toISOString();

  const updatePayload = {
    uid: user.uid,
    email: user.email || existing.email || null,
    phone: user.phoneNumber || existing.phone || '',
    name: user.displayName || existing.name || existing.fullName || 'Operations Admin',
    fullName: user.displayName || existing.fullName || existing.name || 'Operations Admin',
    role: 'ADMIN',
    roles: updatedRoles,
    status: 'ACTIVE',
    onboardingComplete: true,
    updatedAt: now,
  };

  if (!userDoc.exists) {
    updatePayload.createdAt = now;
    await userRef.set(updatePayload);
  } else {
    await userRef.set(updatePayload, { merge: true });
  }

  // Also record in admin audit log
  try {
    await db.collection('adminAuditLogs').doc(`grant-${Date.now()}`).set({
      action: 'GRANT_ROLE',
      entityType: 'USER',
      entityId: user.uid,
      before: existing.role || 'NONE',
      after: 'ADMIN',
      adminId: 'CLI_BOOTSTRAP',
      reason: 'Local developer admin bootstrap',
      timestamp: now,
    });
  } catch {
    // Non-fatal if audit log collection rules fail
  }

  console.log(`\n🎉 SUCCESS! Account promoted to ADMIN:`);
  console.log(`   Database: ${databaseId}`);
  console.log(`   User:     ${user.email || user.uid}`);
  console.log(`   Role:     ADMIN`);
  console.log(`   Roles:    [${updatedRoles.join(', ')}]`);
  console.log(`   Status:   ACTIVE`);
  console.log(`\n🚀 You can now sign in at: http://localhost:3000/auth/admin`);
  console.log(`   Admin Console URL:       http://localhost:3000/admin\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0];

  if (!target || target === '--help' || target === '-h') {
    console.log(`
Veyro Admin Promotion Tool

Usage:
  node scripts/make-admin.cjs <email-or-uid>    Promote user to ADMIN
  node scripts/make-admin.cjs --list            List existing Firebase users and roles

Examples:
  node scripts/make-admin.cjs admin@veyro.in
  node scripts/make-admin.cjs 4a7zX...
  pnpm admin:promote admin@veyro.in
`);
    process.exit(0);
  }

  if (target === '--list' || target === '-l') {
    await listUsers();
    return;
  }

  await promoteToAdmin(target);
}

main().catch((err) => {
  console.error('\n❌ Fatal error running admin promotion script:', err.message);
  process.exit(1);
});
