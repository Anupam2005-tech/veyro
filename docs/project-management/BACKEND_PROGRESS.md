# Veyro — Backend Progress Tracker

**Last updated:** 21 November 2026

**Stack:** Node.js + Express.js + TypeScript, Firebase Admin SDK, Cloud Firestore, RTDB, Cloud Storage  
**Spec reference:** `docs/veyro_backend.md` §2–17; `docs/veyro.md` §4–5, §6 (PROMPT 07)  

---

## Team 2 execution

The [Team 2 plan](TEAM_2_PLAN.md) defines feature order and limits each person to one active feature. Use this tracker for task status and evidence. Verify inherited statuses and the new BE-041–043 rows against the implementation before starting work. Confirm API ownership for Team 1 handoffs with Team 1 as specified in §12.2.

## Legend

| Status | Meaning |
|---|---|
| | No code exists |
| IN_PROGRESS | Active development |
| REVIEW | Code written, awaiting review |
| DONE | Reviewed, tested, merged |
| BLOCKED | Cannot proceed — see blocker |
| DEFERRED | Not in Release 1 scope |

---

## M0 — Foundation (Backend spec §16 step 1–2)

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| BE-FND-001 | Express app scaffold (`app.ts`, `server.ts`) | REVIEW | Anupam | FND-007 | 21 Nov, T2-A1. Fixed TS2307 in the standalone API build. Build and type-check passed. Compiled server returned health 200 and unknown-route 404. Awaiting review and merge. [OpenSpec checklist](../../openspec/changes/build-api-scaffold/tasks.md) |
| BE-FND-002 | Central config module (`config/env.ts`) with startup validation | | Anupam | BE-FND-001 | dotenv locally |
| BE-FND-003 | Firebase Admin SDK init (`config/firebase-admin.ts`) | | Anupam | BE-FND-002 | Shared singleton instance |
| BE-FND-004 | Global error middleware + AppError class hierarchy | | Anupam | BE-FND-001 | Safe client responses |
| BE-FND-005 | Request context middleware (requestId tracking) | | Anupam | BE-FND-001 | Attach `req.id`, `X-Request-Id` |
| BE-FND-006 | Response helpers (`sendSuccess`, `sendError`) | | Anupam | BE-FND-004 | Canonical envelope format |
| BE-FND-007 | CORS configuration | | Anupam | BE-FND-001 | Whitelisted origins only |
| BE-FND-008 | Health endpoint (`GET /api/v1/health`) | | Anupam | BE-FND-001 | Non-sensitive status check |
| BE-FND-009 | express-validator middleware setup | | Anupam | BE-FND-001 | Array details format |
| BE-FND-010 | OpenAPI/Swagger setup (`docs/openapi.yaml`, Swagger UI) | | Anupam | BE-FND-001 | Interactive API documentation |

---

## M1 — Identity & Access (Backend spec §16 step 3)

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| BE-001 | Firebase Auth middleware (`authenticate.ts`) | | Anupam | BE-FND-003 | Verify Bearer ID token |
| BE-002 | Role middleware (`require-role.ts`) | | Anupam | BE-001 | CUSTOMER, DRIVER, ADMIN |
| BE-003 | Auth module — `POST /api/v1/auth/session` profile bootstrap | | Anupam | BE-001 | Sync Firebase Auth with Firestore |
| BE-004 | App Check middleware (verify limited-use token) | | Anupam | BE-FND-003 | `X-Firebase-AppCheck` header |

---

## M1 — Core Data Modules (Backend spec §16 step 4)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-005 | Customer module (CRUD, profile, status) | `customers/` | | Team 1 — Sid / Nishan | BE-001 | |
| BE-006 | Vehicle module (CRUD, compatibility attributes) | `vehicles/` | | Team 1 — Sid / Nishan | BE-005 | Category, transmission |
| BE-007 | Driver module (profile, capabilities, rates, service areas) | `drivers/` | | Team 1 — Sid / Nishan | BE-001 | HOURLY active, PER_KM stored |
| BE-008 | Application module (submission, review, document metadata) | `applications/` | | Team 1 — Sid / Nishan | BE-007 | PENDING_REVIEW state |
| BE-009 | Document upload completion endpoint | `applications/` | | Team 1 — Sid / Nishan | BE-008 | Storage path validation |
| BE-010 | Availability module (online/offline, eligibility check) | `availability/` | REVIEW | Pranesh (Team 3 — Bipul / Pranesh) | BE-007 | Feature: T3-BE010; updated: 2026-11-22; reviewer: Bipul + Team 2 security review pending; change/paths: `apps/api/src/modules/availability/availability.types.ts`, `availability.service.ts`, `availability.validator.ts`, `apps/api/test/availability.test.cjs`; evidence: `pnpm --filter @veyro/contracts build` + `pnpm --filter @veyro/api type-check` passed, `pnpm --filter @veyro/api build` passed, `node --test availability+hourly-fare+admin-decision-rules` 14 passed (5 new availability); blocker/next: needs BE-007 driver persistence contract and BE-001 auth for route wiring + Team 2 security review; no OpenSpec change approved for Team 3 yet. Final booking eligibility belongs to BE-012 |

---

## M2 — Booking Core (Backend spec §16 step 5)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-011 | Quote module (fare estimate, snapshot) | `quotes/` | BLOCKED | Pritam | BE-006, BE-010 | T2-P2. Hourly estimate and immutable in-memory quote snapshot verified with fixtures. Await A2, Team 1 vehicle/driver, Team 3 availability/routing and the agreed persisted quote snapshot. Reviewer: Anupam. [OpenSpec](../../openspec/changes/add-hourly-fare-calculation/tasks.md) |
| BE-012 | Booking module — creation, state machine | `bookings/` | | Anupam | BE-011 | Atomic state transitions |
| BE-013 | Instant offer lifecycle (5-min expiry, atomic accept) | `bookings/` | | Anupam | BE-012 | Firestore transaction |
| BE-014 | Scheduled booking lifecycle (broadcast timing, NEEDS_REBOOK) | `bookings/` | | Anupam | BE-012 | Pickup-12h to pickup-2h |
| BE-015 | Cancellation module (policy calculation, reason recording) | `bookings/` | | Anupam | BE-012 | DEC-05 slabs |

---

## M3 — Trip Core (Backend spec §16 step 6)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-016 | Trip module — state machine, arrival confirmation | `trips/` | | Anupam | BE-012 | Geofence verification |
| BE-017 | Waiting timer and no-show logic | `trips/` | | Anupam | BE-016 | 15m free, 30m max, ₹50/₹150 |
| BE-018 | Start/End OTP (generate, hash, verify, consume) | `trips/` | | Anupam | BE-016 | Separate, single-use codes |
| BE-019 | GPS location endpoint + RTDB write | `trips/` | REVIEW | Team 3 — Bipul / Pranesh | BE-016 | T3 complete 2026-11-22; service + `location.controller|routes.ts` wired in `app.ts`, 401 without verified auth (BE-001), assignment via BE-016; RTDB write via Admin SDK pending; api build/type-check + 13 Team3 tests passed |
| BE-020 | Share links module (token, hash, revoke, expiry) | `share-links/` | REVIEW | Team 3 — Bipul / Pranesh | BE-016 | T3 complete 2026-11-22; service + `share-link.controller|routes.ts` wired in `app.ts`, 401 without verified session; persistence + ownership via BE-001/BE-016 pending |

---

## M4 — Payments & Safety (Backend spec §16 step 7)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-021 | Payment module — Razorpay order creation | `payments/` | BLOCKED | Pritam | BE-016, BE-042 | T2-P3. Await authoritative trip completion, payable fare and charge facts, stored attempt ownership and Test Mode order integration. |
| BE-022 | Payment signature + webhook verification | `payments/` | BLOCKED | Pritam | BE-021 | T2-P3. Checkout and raw webhook signature checks implemented and three tests passed. Await stored payment attempts, raw-body HTTP wiring, and provider capture confirmation. [OpenSpec](../../openspec/changes/add-razorpay-signature-verification/tasks.md) |
| BE-023 | Webhook deduplication + idempotent transitions | `payments/` | BLOCKED | Pritam | BE-022 | T2-P3. Await BE-021 stored attempts, BE-022 raw HTTP/capture wiring, and shared Firestore transactions for atomic provider-event deduplication. |
| BE-024 | Outstanding balance gate | `payments/` | NOT_STARTED | Pritam | BE-043, BE-012 | Block new booking on balance |
| BE-025 | Report module (submission, privacy, Admin resolution) | `reports/` | NOT_STARTED | Pritam | BE-001 | Reporter identity concealed |
| BE-026 | SOS module (event recording, demo mode) | `sos/` | NOT_STARTED | Pritam | BE-016 | Demo SOS messaging |
| BE-027 | 5th-incident suspension automation | `admin/` | NOT_STARTED | Pritam | BE-015, BE-017 | Driver no-show & customer cancel |
| BE-028 | Notification module (Firestore records + FCM) | `notifications/` | REVIEW | Team 3 — Bipul / Pranesh | BE-001 | T3 complete 2026-11-22; service + `notification.controller|routes.ts` wired in `app.ts` (`/tokens`, `/delivery-check`); persistence + FCM send pending BE-001; web `firebase-messaging-sw.js` placeholder added |
| BE-029 | Audit module (append-only Admin action log) | `audit/` | BLOCKED | Pritam | BE-001 | T2-P1, 21 Nov 2026. Internal service and create-only repository implemented, including rejection of profile/document objects as audit state. API build/type-check, fresh startup, health HTTP 200, strict OpenSpec validation, four unit tests and the Firestore emulator atomic append/duplicate-ID rollback test passed. [OpenSpec checklist](../../openspec/changes/add-admin-audit-log/tasks.md). Next: wire verified identity, Admin authorization and shared Firestore (BE-001, BE-002, BE-FND-003), then verify unauthorized HTTP requests do not write. Reviewer: Anupam. |

---

## M4 — Admin (Backend spec §16 step 7)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-030 | Admin application review (approve/reject/request-changes) | `admin/` | BLOCKED | Pritam | BE-008, BE-029 | T2-P1. Manual decision rules and rejection tests passed. Await A2, Team 1 application/document interfaces (BE-008/009), and transactional audit. U04 blocks automatic scoring. [OpenSpec](../../openspec/changes/add-admin-decision-rules/tasks.md) |
| BE-031 | Admin driver controls (deactivate/restore) | `admin/` | BLOCKED | Pritam | BE-007, BE-029 | T2-P1. Driver approval transitions tested. Await A2, Team 1 driver profile, transactional audit and eligibility/presence integration. [OpenSpec](../../openspec/changes/add-admin-decision-rules/tasks.md) |
| BE-032 | Admin customer controls (view/restore) | `admin/` | BLOCKED | Pritam | BE-005, BE-029 | T2-P1. Suspended-to-active transition tested. Await A2, Team 1 customer profile and status contract, and transactional audit. [OpenSpec](../../openspec/changes/add-admin-decision-rules/tasks.md) |
| BE-033 | Admin report resolution | `admin/` | NOT_STARTED | Pritam | BE-025, BE-029 | Resolution note required |

---

## M5 — Background Functions & Testing (Backend spec §16 steps 8–9)

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| BE-034 | Scheduled booking/offer expiry function | NOT_STARTED | Anupam | BE-013, BE-014 | 2nd-gen Cloud Function |
| BE-035 | Scheduled broadcast lifecycle function | NOT_STARTED | Anupam | BE-014 | Idempotent broadcast transitions |
| BE-036 | RTDB presence/location cleanup function | REVIEW | Team 3 — Bipul / Pranesh | BE-019 | T3 complete 2026-11-22; pure selector + `functions/src/team3.ts:pruneStalePresence` (5-min schedule); actual RTDB delete pending Admin SDK init (BE-FND-003) + runtime identity |
| BE-037 | Firestore-trigger notification handlers | REVIEW | Team 3 — Bipul / Pranesh | BE-028 | T3 complete 2026-11-22; `functions/src/team3.ts:dispatchNotifications` on `notificationQueue/{eventId}` with idempotent builder; Firestore write + FCM send pending Admin SDK init |
| BE-038 | Unit tests — fare, waiting, cancellation, OTP, suspension | NOT_STARTED | Pritam (coordination) | M2–M4 modules | Jest unit suite |
| BE-039 | Integration tests — auth, roles, Firestore transactions | NOT_STARTED | Anupam (coordination) | M1–M4 modules | Supertest + emulator |
| BE-040 | Security tests — access across accounts, RTDB and share tokens | NOT_STARTED | Anupam (coordination) | M1–M4 modules | Team 3 tests RTDB and share tokens |

---

## Infrastructure

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| INF-001 | Firestore Security Rules (deny-by-default) | NOT_STARTED | Anupam | FND-013 | Restrictive client rules |
| INF-002 | RTDB Security Rules (deny-by-default) | REVIEW | Bipul (Team 3 — Bipul / Pranesh) | FND-013 | Feature: T3-INF002; updated: 2026-11-22; reviewer: Pranesh + Team 2 security review pending; change/paths: `infra/firebase/database.rules.json`; evidence: JSON parse valid, root + `trips/$tripId/location|presence` + `drivers/$driverId/presence` all `.read/.write false`; no client writes, server Admin SDK bypasses rules; blocker/next: narrow per-trip read grants await BE-019 path + BE-001 auth claims + BE-016 trip state; emulator cross-account tests pending |
| INF-003 | Storage Security Rules (deny-by-default) | NOT_STARTED | Anupam | FND-013 | Private document paths |
| INF-004 | Firestore composite indexes | NOT_STARTED | Anupam | BE-012 | `firestore.indexes.json` |
| INF-005 | Firebase Emulator Suite configuration | NOT_STARTED | Anupam | FND-014 | Local testing harness |
| INF-006 | Firebase App Hosting deployment config | NOT_STARTED | Team 1 — Sid / Nishan | FND-006, FND-014 | `apphosting.yaml` |
| INF-007 | Cloud Functions deployment config | NOT_STARTED | Anupam | FND-008, FND-014 | Runtime service identity |

## Additional Team 2 scope

These tasks add explicit tracking for requirements already in §12.3. `NOT_STARTED` here means execution has not been activated in this plan; confirm existing code before implementation.

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| BE-041 | Provider linking, conflict recovery and controlled Admin grants | NOT_STARTED | Anupam | BE-001–004 | T2-A2; security review required |
| BE-042 | Authoritative final fare service and frozen policy/rate snapshots | BLOCKED | Pritam | BE-011; BE-016/017 for integration | T2-P2. Final hourly base fare from frozen rate and elapsed OTP time implemented. Seven fare and quote snapshot tests plus API build/type-check passed. The initial fare slice passed health HTTP 200. Await persisted snapshot and A5/A6 trip timing and charge facts. Reviewer: Anupam. [OpenSpec](../../openspec/changes/add-hourly-fare-calculation/tasks.md) |
| BE-043 | Ledger, earnings, disputes and audited adjustments | NOT_STARTED | Pritam | BE-023, BE-042, BE-015/017 | T2-P4; ledger invariants and duplicate-event tests |
