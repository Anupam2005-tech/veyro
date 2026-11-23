import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Database } from './types.js';
import { seedDatabase } from './seed.js';

/**
 * Local durable store for development and the college demo.
 *
 * Firebase is not provisioned yet (PROJECT_STATUS FND-017), so the API keeps
 * one JSON document on disk. Node runs request handlers on a single thread and
 * every mutation below is synchronous, so each `mutate()` call is atomic — the
 * same guarantee the Firestore transactions in the spec provide for
 * first-acceptance, OTP consumption and payment state.
 */
const DB_VERSION = 1;

export const DATA_DIR = resolve(process.env.VEYRO_DATA_DIR ?? resolve(process.cwd(), '.data'));
const DB_FILE = resolve(DATA_DIR, 'db.json');

let state: Database | null = null;
let saveTimer: NodeJS.Timeout | null = null;

function emptyDatabase(): Database {
  return {
    meta: { version: DB_VERSION, sessionSecret: randomBytes(32).toString('hex'), seededAt: new Date().toISOString() },
    users: [],
    vehicles: [],
    drivers: [],
    applications: [],
    bookings: [],
    trips: [],
    ledger: [],
    payments: [],
    webhookEvents: [],
    reports: [],
    notifications: [],
    auditLogs: [],
    shareLinks: [],
    sosEvents: [],
    signInCodes: [],
  };
}

function load(): Database {
  if (existsSync(DB_FILE)) {
    try {
      const parsed = JSON.parse(readFileSync(DB_FILE, 'utf8')) as Database;
      if (parsed.meta?.version === DB_VERSION) {
        return { ...emptyDatabase(), ...parsed };
      }
      console.warn('[Veyro API] Data file version changed — reseeding demo data.');
    } catch {
      console.warn('[Veyro API] Data file unreadable — reseeding demo data.');
    }
  }
  const fresh = emptyDatabase();
  seedDatabase(fresh);
  writeNow(fresh);
  return fresh;
}

function writeNow(data: Database): void {
  mkdirSync(dirname(DB_FILE), { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 1));
  renameSync(tmp, DB_FILE);
}

export function db(): Database {
  if (!state) state = load();
  return state;
}

function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (state) writeNow(state);
  }, 150);
}

/** Run a synchronous mutation atomically and persist it. */
export function mutate<T>(fn: (data: Database) => T): T {
  const result = fn(db());
  scheduleSave();
  return result;
}

export function flush(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (state) writeNow(state);
}

/** Wipe and reseed (dev only). */
export function resetDatabase(): void {
  const fresh = emptyDatabase();
  seedDatabase(fresh);
  state = fresh;
  writeNow(fresh);
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
