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
| BE-001 | Firebase Auth middleware (`authenticate.ts`) | REVIEW | Anupam | BE-FND-003 | Verified UID on a protected test route, revocation checks, 401 handling and disabled-account denial. All 44 API tests passed. Reviewer: Pritam. [OpenSpec checklist](../../openspec/changes/authenticate-api-requests/tasks.md) |
| BE-002 | Role middleware (`require-role.ts`) | REVIEW | Anupam | BE-001 | Verified active Firestore roles, legacy single-role profiles and suspension denial. [OpenSpec checklist](../../openspec/changes/implement-identity-access/tasks.md) |
| BE-003 | Auth module — `POST /api/v1/auth/session` profile bootstrap | REVIEW | Anupam | BE-001 | Verified concurrent profile creation, identity sync and existing grant preservation. [OpenSpec checklist](../../openspec/changes/implement-identity-access/tasks.md) |
| BE-004 | App Check middleware (verify limited-use token) | REVIEW | Anupam | BE-FND-003 | Verified consume mode, invalid/expired token handling and replay denial with a verifier test double. Live App Check verification pending. [OpenSpec checklist](../../openspec/changes/implement-identity-access/tasks.md) |

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
| BE-011 | Quote module (fare estimate, snapshot) | `quotes/` | BLOCKED | Pritam | BE-006, BE-010 | Persisted server-built hourly snapshot with owner, vehicle and route. Verified Firestore round trip. Pending verified quote inputs and eligibility from A2 and Teams 1/3. [M2 checklist](../../openspec/changes/implement-booking-core/tasks.md) |
| BE-012 | Booking module — creation, state machine | `bookings/` | BLOCKED | Anupam | BE-011 | Owner-bound, retry-safe creation and state transitions tested in Firestore. Verified identity, balance, vehicle and quote checks still need production adapters. [M2 checklist](../../openspec/changes/implement-booking-core/tasks.md) |
| BE-013 | Instant offer lifecycle (5-min expiry, atomic accept) | `bookings/` | BLOCKED | Anupam | BE-012 | Targeted five-minute offers, rejection, atomic acceptance, reservation conflicts and retry-safe events tested. Pending eligibility integration, expiry trigger and delivery. [M2 checklist](../../openspec/changes/implement-booking-core/tasks.md) |
| BE-014 | Scheduled booking lifecycle (broadcast timing, NEEDS_REBOOK) | `bookings/` | BLOCKED | Anupam | BE-012 | Immediate broadcast at 4–12h confirmed by Anupam; 4h and 30d boundaries, first assignment and NEEDS_REBOOK cutoff tested. Pending eligibility, workers and delivery. [M2 checklist](../../openspec/changes/implement-booking-core/tasks.md) |
| BE-015 | Cancellation module (policy calculation, reason recording) | `bookings/` | BLOCKED | Anupam | BE-012 | DEC-05 fee boundaries, immutable cancellation facts and reservation release tested. Pending approved reasons, authoritative trip facts and downstream incident handling. [M2 checklist](../../openspec/changes/implement-booking-core/tasks.md) |

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
| BE-021 | Payment module — Razorpay order creation | `payments/` | BLOCKED | Pritam | BE-016, BE-042 | Test Mode adapter, stored owner/amount, one active order claim and safe idempotency implemented. Pending authoritative invoice producer, real provider test and ambiguous order reconciliation. [M4 checklist](../../openspec/changes/implement-payments-safety/tasks.md) |
| BE-022 | Payment signature + webhook verification | `payments/` | REVIEW | Pritam | BE-021 | Protected Checkout verification and raw signed webhook routes fetch provider status before settlement. External provider verification remains pending. [M4 checklist](../../openspec/changes/implement-payments-safety/tasks.md) |
| BE-023 | Webhook deduplication + idempotent transitions | `payments/` | REVIEW | Pritam | BE-022 | Atomic capture/failure transitions, unique event IDs and one invoice capture receipt tested with concurrent deliveries. Full BE-043 ledger integration pending. [M4 checklist](../../openspec/changes/implement-payments-safety/tasks.md) |
| BE-024 | Outstanding balance gate | `payments/` | BLOCKED | Pritam | BE-043, BE-012 | Customer-scoped confirmed payables now checked inside BookingCore creation transactions. Pending authoritative ledger/charge producer and dispute integration. [M4 checklist](../../openspec/changes/implement-payments-safety/tasks.md) |
| BE-025 | Report module (submission, privacy, Admin resolution) | `reports/` | REVIEW | Pritam | BE-001 | Participant submission, approved-category check, private reporter reads, Admin views/resolution and atomic audit/inbox implemented. Requires category configuration and trip producer. [M4 checklist](../../openspec/changes/implement-payments-safety/tasks.md) |
| BE-026 | SOS module (event recording, demo mode) | `sos/` | BLOCKED | Pritam | BE-016 | Demo SOS creation and audited cancellation implemented and retry-tested. Pending authoritative trip/GPS integration and console handoff. [M4 checklist](../../openspec/changes/implement-payments-safety/tasks.md) |
| BE-027 | 5th-incident suspension automation | `admin/` | BLOCKED | Pritam | BE-015, BE-017 | Verified incident processor and Functions trigger increment once and suspend at fifth incident. Pending evidence producers, availability integration and policy reconciliation. [M4 checklist](../../openspec/changes/implement-payments-safety/tasks.md) |
| BE-028 | Notification module (Firestore records + FCM) | `notifications/` | REVIEW | Team 3 — Bipul / Pranesh | BE-001 | Owner-scoped inbox, device registration/removal, leased FCM dispatch, retries and index added. Real FCM delivery and Functions/index deployment pending. Team 3 handoff required. [M4 checklist](../../openspec/changes/implement-payments-safety/tasks.md) |
| BE-029 | Audit module (append-only Admin action log) | `audit/` | REVIEW | Pritam | BE-001 | Admin report resolution reads authoritative roles and commits report state, append-only audit and reporter notification together. Other Admin action integrations remain. [M4 checklist](../../openspec/changes/implement-payments-safety/tasks.md) |

---

## M4 — Admin (Backend spec §16 step 7)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-030 | Admin application review (approve/reject/request-changes) | `admin/` | BLOCKED | Pritam | BE-008, BE-029 | T2-P1. Manual decision rules and rejection tests passed. Await A2, Team 1 application/document interfaces (BE-008/009), and transactional audit. U04 blocks automatic scoring. [OpenSpec](../../openspec/changes/add-admin-decision-rules/tasks.md) |
| BE-031 | Admin driver controls (deactivate/restore) | `admin/` | BLOCKED | Pritam | BE-007, BE-029 | T2-P1. Driver approval transitions tested. Await A2, Team 1 driver profile, transactional audit and eligibility/presence integration. [OpenSpec](../../openspec/changes/add-admin-decision-rules/tasks.md) |
| BE-032 | Admin customer controls (view/restore) | `admin/` | BLOCKED | Pritam | BE-005, BE-029 | T2-P1. Suspended-to-active transition tested. Await A2, Team 1 customer profile and status contract, and transactional audit. [OpenSpec](../../openspec/changes/add-admin-decision-rules/tasks.md) |
| BE-033 | Admin report resolution | `admin/` | REVIEW | Pritam | BE-025, BE-029 | Report resolution endpoint requires Admin role and note; report, audit and inbox commit atomically. [M4 checklist](../../openspec/changes/implement-payments-safety/tasks.md) |

---

## M5 — Background Functions & Testing (Backend spec §16 steps 8–9)

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| BE-034 | Scheduled booking/offer expiry function | NOT_STARTED | Anupam | BE-013, BE-014 | 2nd-gen Cloud Function |
| BE-035 | Scheduled broadcast lifecycle function | NOT_STARTED | Anupam | BE-014 | Idempotent broadcast transitions |
| BE-036 | RTDB presence/location cleanup function | NOT_STARTED | Team 3 — Bipul / Pranesh | BE-019 | Prune inactive trip trails |
| BE-037 | Firestore-trigger notification handlers | REVIEW | Team 3 — Bipul / Pranesh | BE-028 | Inbox-created dispatch and bounded retry schedule implemented under BE-028. Deployment and live delivery verification pending. [M4 checklist](../../openspec/changes/implement-payments-safety/tasks.md) |
| BE-038 | Unit tests — fare, waiting, cancellation, OTP, suspension | NOT_STARTED | Pritam (coordination) | M2–M4 modules | Jest unit suite |
| BE-039 | Integration tests — auth, roles, Firestore transactions | IN_PROGRESS | Anupam (coordination) | M1–M4 modules | 22 Nov audit. Auth, roles, session and booking transactions covered by the current node:test emulator suite. All 45 tests pass; remaining domain integrations need coverage. |
| BE-040 | Security tests — access across accounts, RTDB and share tokens | IN_PROGRESS | Anupam (coordination) | M1–M4 modules | 22 Nov audit. Identity spoofing, role denial, suspended accounts and booking ownership have tests. RTDB, share-token and remaining resource access tests are pending. |

---

## Infrastructure

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| INF-001 | Firestore Security Rules (deny-by-default) | REVIEW | Anupam | FND-013 | 22 Nov audit. Deny-all client rules exist in infra/firebase/firestore.rules. Module-specific access and dedicated rules tests remain pending. |
| INF-002 | RTDB Security Rules (deny-by-default) | NOT_STARTED | Team 3 — Bipul / Pranesh | FND-013 | Location path scoping |
| INF-003 | Storage Security Rules (deny-by-default) | REVIEW | Anupam | FND-013 | 22 Nov audit. Deny-all client rules exist in infra/firebase/storage.rules. Private upload authorization and dedicated rules tests remain pending with Team 1. |
| INF-004 | Firestore composite indexes | NOT_STARTED | Anupam | BE-012 | `firestore.indexes.json` |
| INF-005 | Firebase Emulator Suite configuration | REVIEW | Anupam | FND-014 | 22 Nov audit. firebase.json configures the emulator suite. Auth and Firestore verified locally with all 45 API tests on 22 Nov. Other emulator services remain unverified. |
| INF-006 | Firebase App Hosting deployment config | NOT_STARTED | Team 1 — Sid / Nishan | FND-006, FND-014 | `apphosting.yaml` |
| INF-007 | Cloud Functions deployment config | REVIEW | Anupam | FND-008, FND-014 | API package exports repaired; API and Functions build/type-check pass locally. Workspace dependency packaging, secrets binding and deployment remain release checks. [M4 checklist](../../openspec/changes/implement-payments-safety/tasks.md) |

## Additional Team 2 scope

These tasks add explicit tracking for requirements already in §12.3. `NOT_STARTED` here means execution has not been activated in this plan; confirm existing code before implementation.

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| BE-041 | Provider linking, conflict recovery and controlled Admin grants | NOT_STARTED | Anupam | BE-001–004 | T2-A2; security review required |
| BE-042 | Authoritative final fare service and frozen policy/rate snapshots | BLOCKED | Pritam | BE-011; BE-016/017 for integration | T2-P2. Final hourly base fare from frozen rate and elapsed OTP time implemented. Seven fare and quote snapshot tests plus API build/type-check passed. The initial fare slice passed health HTTP 200. Await persisted snapshot and A5/A6 trip timing and charge facts. Reviewer: Anupam. [OpenSpec](../../openspec/changes/add-hourly-fare-calculation/tasks.md) |
| BE-043 | Ledger, earnings, disputes and audited adjustments | BLOCKED | Pritam | BE-023, BE-042, BE-015/017 | T2-P4. Completed-trip 48-hour timing rule and boundary tests pass. Await verified payments, trip/charge facts, shared transaction and report linkage; U05 settlement and no-trip timing remain open. [OpenSpec](../../openspec/changes/add-completed-trip-dispute-window/tasks.md) |
