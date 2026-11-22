# Veyro — Backend Progress Tracker

**Last updated:** 22 November 2026

**Stack:** Node.js + Express.js + TypeScript, Firebase Admin SDK, Cloud Firestore, RTDB, Cloud Storage  
**Spec reference:** `docs/veyro_backend.md` §2–17; `docs/veyro.md` §4–5, §6 (PROMPT 07)  

---

## Team 2 execution

| Team 2 rule | Current value |
|---|---|
| Feature execution | One active feature per person, including review |
| Feature order and dependencies | [TEAM_2_PLAN.md](TEAM_2_PLAN.md) |
| Task evidence | This tracker |
| External ownership | Team 1 owns frontend, Team 3 owns Maps/GPS, presence, notifications and sharing |
| Status note | Verify inherited statuses and BE-041–043 against implementation before starting work |

## Legend

| Status | Meaning |
|---|---|
| NOT_STARTED | No code exists |
| IN_PROGRESS | Active development |
| REVIEW | Code written, awaiting review |
| DONE | Reviewed, tested, merged |
| BLOCKED | Cannot proceed — see blocker |
| DEFERRED | Not in Release 1 scope |

---

## M0 — Foundation (Backend spec §16 step 1–2)

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| BE-FND-001 | Express app scaffold (`app.ts`, `server.ts`) | REVIEW | Anupam | FND-007 | 21 Nov, T2-A1. Fixed TS2307 in the standalone API build. Build and type-check passed. Compiled server returned health 200 and unknown-route 404. Merged in PR #9; independent review evidence pending. [OpenSpec checklist](../../openspec/changes/build-api-scaffold/tasks.md) |
| BE-FND-002 | Central config module (`config/env.ts`) with startup validation | REVIEW | Anupam | BE-FND-001 | 21 Nov. Standalone build, type-check and API configuration tests passed. [OpenSpec checklist](../../openspec/changes/validate-api-config/tasks.md). On team branch at 829c3f4, pending merge to main. |
| BE-FND-003 | Firebase Admin SDK init (`config/firebase-admin.ts`) | REVIEW | Anupam | BE-FND-002 | 22 Nov. Default app reuse and managed configuration tested. API build and type-check passed. All 24 API tests passed with the Firestore emulator. Reviewer: Pritam. [OpenSpec checklist](../../openspec/changes/initialize-firebase-admin/tasks.md) |
| BE-FND-004 | Global error middleware + AppError class hierarchy | REVIEW | Anupam | BE-FND-001 | 22 Nov. Safe Express error responses, parser failures and missing routes verified. API build, type-check and all 27 emulator-backed suite tests passed. Reviewer: Pritam. [OpenSpec checklist](../../openspec/changes/add-api-error-handler/tasks.md) |
| BE-FND-005 | Request context middleware (requestId tracking) | REVIEW | Anupam | BE-FND-001 | Request, header and envelope IDs verified across health, parser errors, missing routes and preflight. Build, type-check and all 29 API tests passed. Reviewer: Pritam. [OpenSpec checklist](../../openspec/changes/add-request-context/tasks.md) |
| BE-FND-006 | Response helpers (`sendSuccess`, `sendError`) | REVIEW | Anupam | BE-FND-004 | Verified success and error envelopes, field details, pagination and 204 over HTTP. All 30 API tests passed. Pritam reviews the API changes; shared contract review pending under §12.7. [OpenSpec checklist](../../openspec/changes/verify-api-response-helpers/tasks.md) |
| BE-FND-007 | CORS configuration | REVIEW | Anupam | BE-FND-001 | Matching, mismatched and absent origins verified on GET and OPTIONS. API build, type-check and all 31 tests passed. Reviewer: Pritam. [OpenSpec checklist](../../openspec/changes/enforce-api-cors/tasks.md) |
| BE-FND-008 | Health endpoint (`GET /api/v1/health`) | REVIEW | Anupam | BE-FND-001 | Existing health payload preserved and cache prevention verified over HTTP. [OpenSpec checklist](../../openspec/changes/verify-api-health/tasks.md) |
| BE-FND-009 | express-validator middleware setup | REVIEW | Anupam | BE-FND-001 | Valid sanitized input and multiple invalid fields verified through a test route. [OpenSpec checklist](../../openspec/changes/add-api-request-validation/tasks.md) |
| BE-FND-010 | OpenAPI/Swagger setup (`docs/openapi.yaml`, Swagger UI) | REVIEW | Anupam | BE-FND-001 | Verified disabled and production routes, local assets, OpenAPI content and browser rendering. [OpenSpec checklist](../../openspec/changes/add-api-swagger-ui/tasks.md) |

---

## M1 — Identity & Access (Backend spec §16 step 3)

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| BE-001 | Firebase Auth middleware (`authenticate.ts`) | NOT_STARTED | Anupam | BE-FND-003 | Verify Bearer ID token |
| BE-002 | Role middleware (`require-role.ts`) | NOT_STARTED | Anupam | BE-001 | CUSTOMER, DRIVER, ADMIN |
| BE-003 | Auth module — `POST /api/v1/auth/session` profile bootstrap | NOT_STARTED | Anupam | BE-001 | Sync Firebase Auth with Firestore |
| BE-004 | App Check middleware (verify limited-use token) | NOT_STARTED | Anupam | BE-FND-003 | `X-Firebase-AppCheck` header |

---

## M1 — Core Data Modules (Backend spec §16 step 4)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-005 | Customer module (CRUD, profile, status) | `customers/` | NOT_STARTED | Team 1 — Sid / Nishan | BE-001 | |
| BE-006 | Vehicle module (CRUD, compatibility attributes) | `vehicles/` | NOT_STARTED | Team 1 — Sid / Nishan | BE-005 | Category, transmission |
| BE-007 | Driver module (profile, capabilities, rates, service areas) | `drivers/` | NOT_STARTED | Team 1 — Sid / Nishan | BE-001 | HOURLY active, PER_KM stored |
| BE-008 | Application module (submission, review, document metadata) | `applications/` | NOT_STARTED | Team 1 — Sid / Nishan | BE-007 | PENDING_REVIEW state |
| BE-009 | Document upload completion endpoint | `applications/` | NOT_STARTED | Team 1 — Sid / Nishan | BE-008 | Storage path validation |
| BE-010 | Availability module (online/offline, eligibility check) | `availability/` | NOT_STARTED | Team 3 — Bipul / Pranesh | BE-007 | Presence and availability checks. Final booking eligibility belongs to BE-012 |

---

## M2 — Booking Core (Backend spec §16 step 5)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-011 | Quote module (fare estimate, snapshot) | `quotes/` | BLOCKED | Pritam | BE-006, BE-010 | T2-P2. Hourly estimate and immutable in-memory quote snapshot verified with fixtures. Await A2, Team 1 vehicle/driver, Team 3 availability/routing and the agreed persisted quote snapshot. Reviewer: Anupam. [OpenSpec](../../openspec/changes/add-hourly-fare-calculation/tasks.md) |
| BE-012 | Booking module — creation, state machine | `bookings/` | NOT_STARTED | Anupam | BE-011 | Atomic state transitions |
| BE-013 | Instant offer lifecycle (5-min expiry, atomic accept) | `bookings/` | NOT_STARTED | Anupam | BE-012 | Firestore transaction |
| BE-014 | Scheduled booking lifecycle (broadcast timing, NEEDS_REBOOK) | `bookings/` | NOT_STARTED | Anupam | BE-012 | Pickup-12h to pickup-2h |
| BE-015 | Cancellation module (policy calculation, reason recording) | `bookings/` | NOT_STARTED | Anupam | BE-012 | DEC-05 slabs |

---

## M3 — Trip Core (Backend spec §16 step 6)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-016 | Trip module — state machine, arrival confirmation | `trips/` | NOT_STARTED | Anupam | BE-012 | Geofence verification |
| BE-017 | Waiting timer and no-show logic | `trips/` | NOT_STARTED | Anupam | BE-016 | 15m free, 30m max, ₹50/₹150 |
| BE-018 | Start/End OTP (generate, hash, verify, consume) | `trips/` | NOT_STARTED | Anupam | BE-016 | Separate, single-use codes |
| BE-019 | GPS location endpoint + RTDB write | `trips/` | NOT_STARTED | Team 3 — Bipul / Pranesh | BE-016 | Stale cutoff 30s |
| BE-020 | Share links module (token, hash, revoke, expiry) | `share-links/` | NOT_STARTED | Team 3 — Bipul / Pranesh | BE-016 | Authenticated read-only view |

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
| BE-028 | Notification module (Firestore records + FCM) | `notifications/` | NOT_STARTED | Team 3 — Bipul / Pranesh | BE-001 | Push fallback to in-app |
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
| BE-036 | RTDB presence/location cleanup function | NOT_STARTED | Team 3 — Bipul / Pranesh | BE-019 | Prune inactive trip trails |
| BE-037 | Firestore-trigger notification handlers | NOT_STARTED | Team 3 — Bipul / Pranesh | BE-028 | FCM delivery dispatcher |
| BE-038 | Unit tests — fare, waiting, cancellation, OTP, suspension | NOT_STARTED | Pritam (coordination) | M2–M4 modules | Jest unit suite |
| BE-039 | Integration tests — auth, roles, Firestore transactions | NOT_STARTED | Anupam (coordination) | M1–M4 modules | Supertest + emulator |
| BE-040 | Security tests — access across accounts, RTDB and share tokens | NOT_STARTED | Anupam (coordination) | M1–M4 modules | Team 3 tests RTDB and share tokens |

---

## Infrastructure

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| INF-001 | Firestore Security Rules (deny-by-default) | NOT_STARTED | Anupam | FND-013 | Restrictive client rules |
| INF-002 | RTDB Security Rules (deny-by-default) | NOT_STARTED | Team 3 — Bipul / Pranesh | FND-013 | Location path scoping |
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
| BE-043 | Ledger, earnings, disputes and audited adjustments | BLOCKED | Pritam | BE-023, BE-042, BE-015/017 | T2-P4. Completed-trip 48-hour timing rule and boundary tests pass. Await verified payments, trip/charge facts, shared transaction and report linkage; U05 settlement and no-trip timing remain open. [OpenSpec](../../openspec/changes/add-completed-trip-dispute-window/tasks.md) |
