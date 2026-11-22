# Veyro — Project Status

**Last updated:** 22 November 2026

**Release:** 1.0 (College Capstone)  
**Spec versions:** Unified Specification v3.6 / Backend Technical Specification v1.3  

---

## Team 2 execution plan

| Person | Current feature | Status | Next action |
|---|---|---|---|
| Anupam | T2-A2 — Identity and authorization | IN_PROGRESS | Review requested M4 implementation and upstream data contracts |
| Pritam | T2-P1 — Admin approval, controls and audit | BLOCKED | Prepare Admin contract while T2-A2 and Team 1 interfaces are pending |

Use [TEAM_2_PLAN.md](TEAM_2_PLAN.md) for feature order and handoff gates. Use [BACKEND_PROGRESS.md](BACKEND_PROGRESS.md) for task evidence.

## Current milestone

| Team 2 progress | Status | Evidence |
|---|---|---|
| BE-FND-001 API scaffold | REVIEW | Merged in PR #9. Independent review evidence pending |
| BE-FND-002 API configuration | REVIEW | Build, type-check and configuration tests passed |
| BE-FND-003 Firebase Admin initialization | REVIEW | API build, type-check and singleton tests passed |
| BE-FND-004 Global error handling | REVIEW | Build and type-check passed. All 27 API tests passed with Firestore emulation. Pushed in 1aa7f33. |
| BE-FND-005 Request context | REVIEW | Build, type-check and all 29 API tests passed with Firestore emulation. Pushed in 1e5e457. |
| BE-FND-006 Response helpers | REVIEW | API build, type-check and all 30 API tests passed with Firestore emulation. Pushed in 4c6f49d. |
| BE-FND-007 CORS configuration | REVIEW | Exact origin matching verified on actual and preflight requests. All 31 API tests passed. |
| BE-FND-008 Public API liveness | REVIEW | Existing health payload preserved and cache prevention verified over HTTP. |
| BE-FND-009 Request validation | REVIEW | Valid sanitized input and multiple invalid fields verified through a test route. |
| BE-FND-010 Interactive API contract | REVIEW | Verified disabled and production routes, local assets, OpenAPI content and browser rendering. |
| BE-001 Firebase authentication | REVIEW | Verified phone sign-in and disabled-user rejection with the Auth emulator. All 44 API tests passed. |
| BE-002–004 Roles, session and App Check | REVIEW | All 45 API tests passed with Auth and Firestore emulation. Live App Check integration pending. |
| BE-021–029 Payments and safety | REVIEW / BLOCKED | Local API/Functions implemented. Invoice/trip/incident producers and real Razorpay/FCM integration remain. |
| BE-011–015 Booking core | BLOCKED | Internal services tested in Firestore. Identity, eligibility, route inputs, workers and cancellation policy adapters pending. |

[Backend task evidence](BACKEND_PROGRESS.md)

| Milestone | Status | Target |
|---|---|---|
| M0 — Repository & Scaffold | IN_PROGRESS | Monorepo structure, root configs, trackers |
| M1 — Design System & Auth | IN_PROGRESS | Shared tokens, components, passwordless auth |
| M2 — Core Booking Flow | IN_PROGRESS | Vehicle pass, instant/scheduled quotes & bookings |
| M3 — Trip Lifecycle & Maps | NOT_STARTED | Arrival, OTP verification, live GPS tracking |
| M4 — Payments & Admin | IN_PROGRESS | Razorpay Test Mode, balance gate, Admin portal |
| M5 — Testing & Deployment | NOT_STARTED | Automated test suite, manual release checklist |

---

## Code and OpenSpec audit — 22 November 2026

This audit includes committed source through `23fef99` and the local BE-001–004 changes. Implementation and test evidence are recorded separately from review and release approval.

| Area | Verified implementation | Remaining work |
|---|---|---|
| BE-FND-001–010 | API scaffold, configuration, Admin initialization, errors, context, responses, CORS, health, validation and Swagger | Review evidence and Functions deployment packaging |
| BE-001–004 | Bearer verification, Firestore role checks, session bootstrap and App Check consumption middleware | Web client must send fresh limited-use tokens; live App Check/IAM verification |
| BE-041 | Existing profile roles are preserved; multi-role profiles can select an already-held role | Provider linking/conflict recovery, controlled Admin grant workflow and approved addition of a second product role |
| BE-011–015 | Durable hourly quote, booking transactions, offers, reservations, scheduled windows and cancellation policy facts | Production eligibility/balance/route/trip adapters, HTTP endpoints and deadline workers |
| BE-016–018 | No trip backend implementation located | Arrival, trip transitions, waiting/no-show and OTP lifecycle |
| Pritam modules | Audit repository, Admin decision rules, hourly fare, signatures, balance policy and dispute deadline helpers | Endpoint wiring, transactional financial records, provider integration and authorization |
| Rules and emulators | Deny-all Firestore/Storage rules and local Auth/Firestore configuration exist | Rules tests and scoped module access; remaining emulator services |
| Functions | Express HTTPS entry point exists | API package exports repaired during M4. Local type-check passes; deployment packaging remains pending |

| Verification | Result |
|---|---|
| API build and type-check | Passed |
| API tests with Auth and Firestore emulators | 48 passed, 0 skipped after M4. Provider and FCM calls use test doubles. |
| Strict OpenSpec validation | 21 changes passed after M4 |
| Functions type-check | Passed after M4 API export repair |
| Public business operations mounted | Health, session, payment and safety routes; Swagger is development opt-in |

### Anupam execution order after this audit

| Order | Work | Dependency |
|---|---|---|
| 1 | Verify Functions workspace packaging for deployment under T2-A1 / INF-007 | Local import failure repaired during M4; deployment packaging pending |
| 2 | Close T2-A2 identity handoff and BE-041 | Coordinate App Check header with Team 1; verify token verifier IAM and real consumption |
| 3 | Integrate booking creation and offers | Teams 1/3 supply authoritative profiles, vehicles, routing and availability; Pritam supplies scoped balance facts |
| 4 | Complete trip, OTP, cancellation and deadline workers | Agreed arrival/no-show interfaces, cancellation reasons and completed booking integration |

The existing readiness reconciliation proposal still contains policy alternatives that disagree with implemented behavior. Review those unresolved items before using it to change response or state contracts. The user's confirmed immediate scheduled broadcast and NEEDS_REBOOK behavior is recorded in `implement-booking-core`.

## Decision register status

All 14 decisions (DEC-01 to DEC-14) are **AGREED** as of 9 November 2026. See `docs/veyro.md` §15.

| ID | Topic | Approved Rule | Status |
|---|---|---|---|
| DEC-01 | Minimum fare/time | No minimum fare, billable time, or billing blocks; actual usage only | AGREED |
| DEC-02 | Pricing mode activation | HOURLY active in Release 1; PER_KM stored but disabled until tested | AGREED |
| DEC-03 | Driver rate limits | No platform min/max rate limits; drivers set their own rates | AGREED |
| DEC-04 | Platform fees | 0% driver commission, ₹0 customer platform fee in Release 1 | AGREED |
| DEC-05 | Cancellation & no-show | 5th-incident account suspension; scheduled slabs (₹0/₹50/₹100); instant ₹0 | AGREED |
| DEC-06 | Waiting & arrival rule | 15 min free, 30 min max wait; ₹50 wait fee (>15 min); ₹150 customer no-show (replaces wait fee) | AGREED |
| DEC-07 | Driver arrival grace | Instant: ETA + 20 min promise; Scheduled: pickup + 20 min | AGREED |
| DEC-08 | Search radius | 15 km initial radius; explicit customer expansion control; no silent expansion | AGREED |
| DEC-09 | SOS alert mode | Demo SOS in Release 1 (records event, simulates alert; no external SMS/emergency dispatch) | AGREED |
| DEC-10 | Trip share authentication | Recipient must authenticate before viewing; valid share token hash verified; no access code | AGREED |
| DEC-11 | Data retention approach | Active ride only for live GPS; separate retention for rides and verification documents | AGREED |
| DEC-12 | Google Maps & budget | $300 Google Cloud credit over 90 days; API restrictions; budget alerts & quotas | AGREED |
| DEC-13 | Hosting & cloud infrastructure | Next.js on Firebase App Hosting; Express API on Cloud Functions (2nd gen); Firestore + RTDB + Storage | AGREED |
| DEC-14 | Tax & invoicing | Tax calculation and commercial invoice generation deferred from Release 1 | AGREED |

---

## Open policy items

| # | Item | Status | Owner | Notes |
|---|---|---|---|---|
| 1 | Incident rolling window | OPEN | Project owner | Durable counter across account lifetime for demo |
| 2 | Data retention durations | OPEN | Project owner | Approach agreed (DEC-11); exact periods needed before real data |
| 3 | Dispute deadline / settlement | OPEN | Project owner | Basic dispute flag and report link for demo |
| 4 | Cancellation reason categories | OPEN | Project owner | Predefined dropdown categories needed before cancellation UI |
| 5 | PER_KM activation criteria | DEFERRED (R1) | Project owner | GPS accuracy benchmarks needed prior to future activation |
| 6 | Firebase region benchmarking | DECIDED | Member 5 | App Hosting (Singapore), Cloud Functions (Hong Kong), Firestore (Mumbai) |

---

## Blockers

| Blocker | Affects | Resolution |
|---|---|---|
| Readiness reconciliation remains pending | Policy and contract reconciliation | Review [`reconcile-project-readiness`](../../openspec/changes/reconcile-project-readiness/tasks.md) before authorized foundation repair |
| Functions deployment packaging unverified | API deployment and background functions | Local export/import checks pass; verify packaged workspace dependencies before deployment |
| Firebase project unprovisioned | Backend runtime, deployment | Firebase console setup and Blaze plan configuration |
| Cancellation reason taxonomy | Cancellation UI, validation | Adopt standard preset reasons for demo |

---

## Foundation tasks (M0)

| Task ID | Description | Status | Owner | Depends on |
|---|---|---|---|---|
| FND-001 | Create `.gitignore` | DONE | Member 5 | — |
| FND-002 | Create `README.md` | DONE | Member 5 | — |
| FND-003 | Commit file reorganisation (docs/, assets, openspec, agent config) | NOT_STARTED | Member 5 | FND-001 |
| FND-004 | Scaffold monorepo workspace (apps/web, apps/api, packages/, functions/) | IN_PROGRESS | Member 5 | FND-003 |
| FND-005 | Create root and per-package `tsconfig.json` | IN_PROGRESS | Member 5 | FND-004 |
| FND-006 | Create `apps/web/` Next.js App Router project | NOT_STARTED | Member 1 | FND-004 |
| FND-007 | Create `apps/api/` Express + TypeScript project | REVIEW | Anupam | FND-004 |
| FND-008 | Create `functions/` Cloud Functions project | NOT_STARTED | Anupam | FND-004 |
| FND-009 | Create `packages/contracts/` shared types | NOT_STARTED | Anupam | FND-004 |
| FND-010 | Create `packages/ui/` shared components package | NOT_STARTED | Member 1 | FND-004 |
| FND-011 | Create `packages/config/` shared lint/tsconfig/tailwind | NOT_STARTED | Member 1 | FND-004 |
| FND-012 | Create `.env.example` (web + api) | NOT_STARTED | Anupam | FND-004 |
| FND-013 | Create `infra/firebase/` with deny-by-default rules | NOT_STARTED | Member 5 | FND-004 |
| FND-014 | Create `firebase.json`, `.firebaserc`, `apphosting.yaml` | NOT_STARTED | Member 5 | FND-013 |
| FND-015 | Populate OpenSpec `config.yaml` with project context | NOT_STARTED | Member 5 | FND-003 |
| FND-016 | Create `.github/workflows/` CI pipeline (lint + type-check) | NOT_STARTED | Member 5 | FND-004 |
| FND-017 | Provision Firebase project (console, Blaze plan, billing) | NOT_STARTED | Project owner | — |
| FND-018 | Copy PWA icons from `veyro-logo-assets/` to `apps/web/public/` | NOT_STARTED | Member 1 | FND-006 |

---

## Cross-references

- Frontend progress tracker → `docs/project-management/FRONTEND_PROGRESS.md`
- Backend progress tracker → `docs/project-management/BACKEND_PROGRESS.md`

