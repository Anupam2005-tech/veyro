# Veyro — Backend Progress Tracker

**Last updated:** 23 November 2026

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
| Status note | Backend implementation is ready for review; owner-held policy and live integration gates are listed in the execution registers |

Execution of all remaining Team 2 work is tracked in the [Team 2 completion register](../../openspec/changes/complete-team2-backend/tasks.md). Each item records implementation and verification separately from external dependencies. The latest owner authorization extends implementation across the remaining backend scope; original frontend ownership remains unchanged. [Core/mobility extension](../../openspec/changes/complete-core-mobility-backend/tasks.md).

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
| BE-005 | Customer module (CRUD, profile, status) | `customers/` | REVIEW | Team 1 — Sid / Nishan | BE-001 | Owned customer profile/onboarding and consent implemented. Physical account deletion remains policy-gated; a deletion-request endpoint records requests. [Core/mobility checklist](../../openspec/changes/complete-core-mobility-backend/tasks.md) |
| BE-006 | Vehicle module (CRUD, compatibility attributes) | `vehicles/` | REVIEW | Team 1 — Sid / Nishan | BE-005 | Owned vehicle create/list/update/delete implemented with server IDs and active-booking checks. [Core/mobility checklist](../../openspec/changes/complete-core-mobility-backend/tasks.md) |
| BE-007 | Driver module (profile, capabilities, rates, service areas) | `drivers/` | REVIEW | Team 1 — Sid / Nishan | BE-001 | Driver profile, rates, capabilities and private-coordinate-free online directory implemented. Sensitive changes force manual re-review. [Core/mobility checklist](../../openspec/changes/complete-core-mobility-backend/tasks.md) |
| BE-008 | Application module (submission, review, document metadata) | `applications/` | REVIEW | Team 1 — Sid / Nishan | BE-007 | Owner/generation-verified upload IDs feed application submission and idempotent retries. Compatibility routes use the same service; approved states cannot be reset by resubmit. [Core/mobility checklist](../../openspec/changes/complete-core-mobility-backend/tasks.md) |
| BE-009 | Document upload completion endpoint | `applications/` | REVIEW | Team 1 — Sid / Nishan | BE-008 | Private binary upload validates size/MIME/signature and records owner/generation. Admin-only immutable document download added. Storage emulator verified. [Core/mobility checklist](../../openspec/changes/complete-core-mobility-backend/tasks.md) |
| BE-010 | Availability module (online/offline, eligibility check) | `availability/` | REVIEW | Team 3 — Bipul / Pranesh | BE-007 | Presence leases, owned road-route creation, service-area/vehicle compatibility and pickup eligibility now produce booking adapter records. Live Maps testing and frontend contract alignment pending. [Core/mobility checklist](../../openspec/changes/complete-core-mobility-backend/tasks.md) |

---

## M2 — Booking Core (Backend spec §16 step 5)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-011 | Quote module (fare estimate, snapshot) | `quotes/` | REVIEW | Pritam | BE-006, BE-010 | Profile/vehicle, road-route, presence and compatibility producer APIs now exist. Scheduled pickup eligibility refresh preserves frozen quotes. Actual Maps/device and web adapter integration pending. [Core/mobility checklist](../../openspec/changes/complete-core-mobility-backend/tasks.md) |
| BE-012 | Booking module — creation, state machine | `bookings/` | REVIEW | Anupam | BE-011 | Booking producers and protected transaction routes connected. Route/pickup binding, balance checks and active-vehicle guards enforced. Live journey integration pending. [Core/mobility checklist](../../openspec/changes/complete-core-mobility-backend/tasks.md) |
| BE-013 | Instant offer lifecycle (5-min expiry, atomic accept) | `bookings/` | REVIEW | Anupam | BE-012 | Protected accept/reject routes, eligible driver rate freeze, promise timestamp, reservations and driver/customer inbox records implemented and tested. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-014 | Scheduled booking lifecycle (broadcast timing, NEEDS_REBOOK) | `bookings/` | REVIEW | Anupam | BE-012 | Scheduled lifecycle now has broadcast/expiry workers, indexes and eligible-recipient inbox integration. NEEDS_REBOOK and immediate late-created broadcast are retained. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-015 | Cancellation module (policy calculation, reason recording) | `bookings/` | REVIEW | Anupam | BE-012 | Approved cancellation reasons adopted. Cancellation writes trip state, applicable payable, immutable fact and reservation release transactionally. Qualifying incidents remain separately pending. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |

---

## M3 — Trip Core (Backend spec §16 step 6)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-016 | Trip module — state machine, arrival confirmation | `trips/` | REVIEW | Anupam | BE-012 | Trip initialization, owned reads, trusted-GPS and customer-confirmed arrival, protected routes and event notifications implemented. GPS evidence producer is implemented; actual device verification remains. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-017 | Waiting timer and no-show logic | `trips/` | REVIEW | Anupam | BE-016 | Customer no-show uses the existing waiting policy. For a driver no-show, the owner reports after the 20-minute grace period and Admin confirmation records the evidence, ends the trip without charge and creates one qualifying incident. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-018 | Start/End OTP (generate, hash, verify, consume) | `trips/` | REVIEW | Anupam | BE-016 | Customer-only issuance, salted phase-bound hashes, up to five-minute expiry, five attempts, 60-second cooldown and single consumption. HTTP and Firestore emulator verified both phases through final payable creation. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-019 | GPS location endpoint + RTDB write | `trips/` | REVIEW | Team 3 — Bipul / Pranesh | BE-016 | Assigned-trip GPS, geofence evidence and Maps pickup ETA refreshed at most once per minute. The original arrival promise remains fixed. Real Maps and device calibration remain pending. [Core/mobility checklist](../../openspec/changes/complete-core-mobility-backend/tasks.md) |
| BE-020 | Share links module (token, hash, revoke, expiry) | `share-links/` | REVIEW | Team 3 — Bipul / Pranesh | BE-016 | Hash-only authenticated shares, minimal approximate views, owner revocation and terminal-trip expiry implemented and tested. [Core/mobility checklist](../../openspec/changes/complete-core-mobility-backend/tasks.md) |

---

## M4 — Payments & Safety (Backend spec §16 step 7)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-021 | Payment module — Razorpay order creation | `payments/` | REVIEW | Pritam | BE-016, BE-042 | One Test Mode order per invoice across retries and browsers. Reconciliation finds or retries the original receipt after an uncertain create. |
| BE-022 | Payment signature + webhook verification | `payments/` | REVIEW | Pritam | BE-021 | Checkout verification, signed webhooks and customer-owned status checks use current Razorpay data. Staging capture and webhook delivery remain pending. |
| BE-023 | Webhook deduplication + idempotent transitions | `payments/` | REVIEW | Pritam | BE-022 | Local HTTP and Firestore regression covered failed attempts, late capture and concurrent verification paths producing one receipt and one capture journal. [M4 checklist](../../openspec/changes/implement-payments-safety/tasks.md) |
| BE-024 | Outstanding balance gate | `payments/` | REVIEW | Pritam | BE-043, BE-012 | Booking balance enforcement now consumes completion/cancellation/no-show payables and excludes active disputes inside the booking transaction. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-025 | Report module (submission, privacy, Admin resolution) | `reports/` | REVIEW | Pritam | BE-001 | Approved report categories adopted as versioned defaults. Private participant reports, Admin review/resolution and audit/inbox integration tested. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-026 | SOS module (event recording, demo mode) | `sos/` | REVIEW | Pritam | BE-016 | Demo SOS, cancellation audit and Admin console read endpoints implemented. GPS enrichment remains dependent on Team 3. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-027 | 5th-incident suspension automation | `admin/` | BLOCKED | Pritam | BE-015, BE-017 | Lifetime verified-incident counting, fifth-incident suspension and audit/inbox implemented. Owner left qualifying reasons/exclusions pending; generic cancellation does not auto-qualify. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-028 | Notification module (inbox, FCM and email) | `notifications/` | REVIEW | Team 3 — Bipul / Pranesh | BE-001 | Inbox and push plus a Resend outbox for account, profile, booking, trip, application and payment updates. Verified recipient checks, lease, idempotency and bounded retries. Staging delivery and Team 3 handoff pending. [M4 checklist](../../openspec/changes/implement-payments-safety/tasks.md) |
| BE-029 | Audit module (append-only Admin action log) | `audit/` | REVIEW | Pritam | BE-001 | Audit integration now covers report resolution, application decisions, driver controls, customer restoration, role grants and ledger corrections. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |

---

## M4 — Admin (Backend spec §16 step 7)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-030 | Admin application review (approve/reject/request-changes) | `admin/` | REVIEW | Pritam | BE-008, BE-029 | Admin pending queue, protected manual decisions, driver approval synchronization, audit and inbox implemented. Profile/application producers implemented; independent review and deployed private-download checks remain. Automatic rubric scoring remains outside current manual workflow. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-031 | Admin driver controls (deactivate/restore) | `admin/` | REVIEW | Pritam | BE-007, BE-029 | Admin driver read/deactivate/restore implemented; deactivation disables server availability. Authorized state transitions, audit and replay behavior tested. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-032 | Admin customer controls (view/restore) | `admin/` | REVIEW | Pritam | BE-005, BE-029 | Customer read/restoration requires Admin and a reason. Durable counters preserved; authorization, idempotency and audit tested. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-033 | Admin report resolution | `admin/` | REVIEW | Pritam | BE-025, BE-029 | Report resolution endpoint requires Admin role and note; report, audit and inbox commit atomically. [M4 checklist](../../openspec/changes/implement-payments-safety/tasks.md) |

---

## M5 — Background Functions & Testing (Backend spec §16 steps 8–9)

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| BE-034 | Scheduled booking/offer expiry function | REVIEW | Anupam | BE-013, BE-014 | Minute-based Functions worker expires due instant/scheduled offers through existing idempotent transactions. Indexes declared; expiry replay tested. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-035 | Scheduled broadcast lifecycle function | REVIEW | Anupam | BE-014 | Minute-based broadcast worker scans due bookings and online drivers, applies authoritative eligibility, and writes addressed offers/inbox records once. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-036 | RTDB presence/location cleanup function | REVIEW | Team 3 — Bipul / Pranesh | BE-019 | Terminal trip cleanup trigger and 15-minute stale presence/location cleanup implemented with late-write RTDB fences. Deployment/invocation checks pending. [Core/mobility checklist](../../openspec/changes/complete-core-mobility-backend/tasks.md) |
| BE-037 | Firestore-trigger notification handlers | REVIEW | Team 3 — Bipul / Pranesh | BE-028 | Inbox-created dispatch and bounded retry schedule implemented under BE-028. Deployment and live delivery verification pending. [M4 checklist](../../openspec/changes/implement-payments-safety/tasks.md) |
| BE-038 | Unit tests — fare, waiting, cancellation, OTP, suspension | REVIEW | Pritam (coordination) | M2–M4 modules | node:test covers hourly fares, cancellation, waiting boundaries, OTP attempts/consumption and suspension. Final suite evidence is recorded in complete-team2-backend. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-039 | Integration tests — auth, roles, Firestore transactions | REVIEW | Anupam (coordination) | M1–M4 modules | Auth/session/roles, booking and trip transactions, financial adjustments and rules have emulator coverage. External App Check/provider delivery verification remains pending. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-040 | Security tests — access across accounts, RTDB and share tokens | REVIEW | Anupam (coordination) | M1–M4 modules | Cross-owner profiles, private uploads, authenticated share view/revocation and RTDB denial now included alongside existing role and financial security tests. [Core/mobility checklist](../../openspec/changes/complete-core-mobility-backend/tasks.md) |

---

## Infrastructure

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| INF-001 | Firestore Security Rules (deny-by-default) | REVIEW | Anupam | FND-013 | Current backend-only Firestore deny-all rules verified against unsigned and signed-in clients; privileged API ownership is covered separately. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| INF-002 | RTDB Security Rules (deny-by-default) | REVIEW | Team 3 — Bipul / Pranesh | FND-013 | RTDB client deny-all policy tested against direct anonymous reads; scoped privileged operations tested through backend service. [Core/mobility checklist](../../openspec/changes/complete-core-mobility-backend/tasks.md) |
| INF-003 | Storage Security Rules (deny-by-default) | REVIEW | Anupam | FND-013 | Storage deny-all rules reject unsigned and authenticated direct listing/uploads. Backend-proxied private uploads are implemented; frontend integration remains with Team 1. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| INF-004 | Firestore composite indexes | REVIEW | Anupam | BE-012 | Booking due-window composite indexes and notification collection-group index declared. Cloud index deployment remains pending. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| INF-005 | Firebase Emulator Suite configuration | REVIEW | Anupam | FND-014 | Auth, Firestore, Storage and RTDB emulators verified under Node22, including direct rules-denial tests. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| INF-006 | Firebase App Hosting deployment config | NOT_STARTED | Team 1 — Sid / Nishan | FND-006, FND-014 | `apphosting.yaml` |
| INF-007 | Cloud Functions deployment config | REVIEW | Anupam | FND-008, FND-014 | Generated deployment package has compiled API/docs, pinned dependencies and Node22 runtime. Independent dependency install and Node22 loading verified; cloud deployment/IAM/secret bindings pending. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |

## Additional Team 2 scope

These tasks add explicit tracking for requirements already in §12.3. Implementation and remaining owner-held dependencies are recorded separately below.

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| BE-041 | Provider linking, conflict recovery and controlled Admin grants | BLOCKED | Anupam | BE-001–004 | Verified-UID provider inspection and lead-only audited role-grant API implemented. Owner will supply ADMIN_GRANTER_UID later; client credential linking/conflict recovery remains a Team 1 handoff. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-042 | Authoritative final fare service and frozen policy/rate snapshots | REVIEW | Pritam | BE-011; BE-016/017 for integration | Successful End OTP computes rounded final hourly fare from frozen rate and server timing, adds one waiting fee and creates payable/earnings atomically. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |
| BE-043 | Ledger, earnings, disputes and audited adjustments | BLOCKED | Pritam | BE-023, BE-042, BE-015/017 | Payables, accrued/paid earnings, capture journals, completed-trip disputes and audited unpaid corrections implemented. No-trip disputes, no-show allocation and captured-payment refund settlement remain policy/provider dependencies. [Execution register](../../openspec/changes/complete-team2-backend/tasks.md) |

## Frontend integration follow-up — 23 November 2026

| Task IDs | Result | Remaining gate |
|---|---|---|
| BE-005–010, BE-019–020 | Canonical frontend producers wired, atomic owned profile saves, private photo/document proxies, shared privacy enforcement and active-trip offline guard | Runtime/device tests and independent review |
| BE-011–018 | Canonical quotes/actions wired; assigned-offer retry, interrupted initialization recovery and customer-only OTP issuance implemented | Deployed OTP verification and lockout recovery |
| BE-021–043 | Test Mode checkout, earnings decomposition, audited review states and scoped screen read models | Actual capture/webhook, lead UID and held policies |
| INF-004/007 | Named-database selection synchronized across API/Functions/triggers; required indexes declared; emulator fixtures explicitly use default database | Deploy rules/indexes to the configured live database; verify IAM/secrets |
| BE-038–040 | Final expanded regression results recorded in [frontend execution register](../../openspec/changes/complete-frontend-integration/tasks.md) | Independent security/financial review and merge |

The sign-in regression preserves suspended status; signing in cannot restore an account or rewrite its roles. Raw provider exceptions are not written to application logs.
