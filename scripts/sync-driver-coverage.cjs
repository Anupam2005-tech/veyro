#!/usr/bin/env node

/**
 * Veyro Driver Coverage Sync Utility
 *
 * Ensures the driver's Firestore records are aligned for local testing:
 *   1. Expands vehicle category endorsements to cover all standard types.
 *   2. Widens serviceAreaBounds to cover the entire testing region.
 *   3. Refreshes driverAvailability with a fresh timestamp and position.
 *
 * Usage:
 *   node scripts/sync-driver-coverage.cjs [uid]
 *
 * If no uid is provided, it updates the first approved driver it finds.
 */

const path = require('path');
const fs = require('fs');

// Resolve firebase-admin from the monorepo
module.paths.push(
  path.resolve(__dirname, '../apps/api/node_modules'),
  path.resolve(__dirname, '../node_modules/.pnpm/firebase-admin@12.7.0/node_modules')
);

// Load environment variables from apps/api/.env
const envPath = path.resolve(__dirname, '../apps/api/.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const projectId = process.env.FIREBASE_PROJECT_ID || 'veyro-ffccc';
const databaseId = process.env.FIRESTORE_DATABASE_ID || 'veyrodatabase';
const app = getApps().length > 0 ? getApps()[0] : initializeApp({ projectId });
const db = getFirestore(app, databaseId);

const ALL_CATEGORIES = ['HATCHBACK', 'SEDAN', 'SUV', 'LUXURY'];
const ALL_TRANSMISSIONS = ['MANUAL', 'AUTOMATIC'];

// Very wide bounds covering Tripura, Assam, Meghalaya, and surrounding regions
const WIDE_BOUNDS = {
  southWest: { lat: 22.0, lng: 90.0 },
  northEast: { lat: 27.0, lng: 93.0 },
};

async function main() {
  const targetUid = process.argv[2] || null;

  let uid = targetUid;
  if (!uid) {
    // Find the first approved driver
    const snap = await db.collection('drivers').where('approvalStatus', '==', 'APPROVED').limit(1).get();
    if (snap.empty) {
      console.error('❌ No approved drivers found in Firestore. Approve a driver first.');
      process.exit(1);
    }
    uid = snap.docs[0].id;
  }

  console.log(`🔧 Syncing driver coverage for UID: ${uid}\n`);

  // 1. Update driver profile with all categories and wide bounds
  const driverRef = db.collection('drivers').doc(uid);
  const driver = await driverRef.get();
  if (!driver.exists) {
    console.error(`❌ No driver document found for ${uid}`);
    process.exit(1);
  }

  const currentCategories = driver.get('categories') ?? [];
  const currentTransmissions = driver.get('transmissions') ?? [];
  const currentBounds = driver.get('serviceAreaBounds');

  console.log('  Current categories:', currentCategories);
  console.log('  Current transmissions:', currentTransmissions);
  console.log('  Current bounds:', JSON.stringify(currentBounds));

  await driverRef.update({
    categories: ALL_CATEGORIES,
    transmissions: ALL_TRANSMISSIONS,
    serviceAreaBounds: WIDE_BOUNDS,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log('\n  ✅ Updated categories to:', ALL_CATEGORIES);
  console.log('  ✅ Updated transmissions to:', ALL_TRANSMISSIONS);
  console.log('  ✅ Updated serviceAreaBounds to:', JSON.stringify(WIDE_BOUNDS));

  // 2. Refresh driverAvailability with fresh timestamp
  const availRef = db.collection('driverAvailability').doc(uid);
  const avail = await availRef.get();
  const position = avail.exists && avail.get('position') ? avail.get('position') : { lat: 23.935, lng: 91.337 };
  const now = Date.now();

  await availRef.set({
    online: true,
    updatedAt: now,
    expiresAt: now + 24 * 60 * 60000,
    position,
  });

  console.log('\n  ✅ Refreshed driverAvailability:');
  console.log('     online: true');
  console.log('     updatedAt:', new Date(now).toISOString());
  console.log('     position:', position);

  // 3. Ensure user document has correct role info
  const userRef = db.collection('users').doc(uid);
  const user = await userRef.get();
  if (user.exists) {
    const roles = user.get('roles') ?? [];
    if (!roles.includes('DRIVER')) {
      await userRef.update({ roles: [...roles, 'DRIVER'] });
      console.log('\n  ✅ Added DRIVER to user roles');
    }
    if (user.get('status') !== 'ACTIVE') {
      await userRef.update({ status: 'ACTIVE' });
      console.log('  ✅ Set user status to ACTIVE');
    }
  }

  console.log('\n🎉 Driver coverage sync complete!');
  console.log('   The driver should now appear in customer searches for any vehicle category');
  console.log('   within the expanded service area bounds.');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

