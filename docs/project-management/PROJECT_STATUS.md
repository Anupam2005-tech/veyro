# Veyro — Project Status

**Last updated:** 23 November 2026

**Release:** 1.0 (College Capstone)  
**Spec versions:** Unified Specification v3.6 / Backend Technical Specification v1.3  

---

## Team 2 execution plan

| Person | Current feature | Status | Next action |
|---|---|---|---|
| Anupam | Team 2 remaining-backend completion | REVIEW / BLOCKED | Review Team 2 completion register and remaining owner/partner inputs |
| Pritam | Payments, Admin and safety implementation review | REVIEW / BLOCKED | Review delivered services; actual capture/webhook and owner-held policy checks remain |

Use [TEAM_2_PLAN.md](TEAM_2_PLAN.md) for feature order and handoff gates. Use [BACKEND_PROGRESS.md](BACKEND_PROGRESS.md) for task evidence.

Current cross-team progress is recorded in the [core and mobility execution register](../../openspec/changes/complete-core-mobility-backend/tasks.md).

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
| BE-021–029 Payments and safety | REVIEW / BLOCKED | Local API/Functions, trip/payable producers and approved categories implemented. Incident qualification and real Razorpay/FCM integration remain. |
| BE-011–015 Booking core | REVIEW | HTTP routes, transactional acceptance, eligibility/route inputs, workers and approved cancellation adapters implemented and emulator-tested; live Maps/frontend verification remains. |

[Backend task evidence](BACKEND_PROGRESS.md)

| Milestone | Status | Target |
|---|---|---|
| M0 — Repository & Scaffold | IN_PROGRESS | Monorepo structure, root configs, trackers |
| M1 — Design System & Auth | IN_PROGRESS | Shared tokens, components, passwordless auth |
| M2 — Core Booking Flow | IN_PROGRESS | Vehicle pass, instant/scheduled quotes & bookings |
| M3 — Trip Lifecycle & Maps | IN_PROGRESS | Backend arrival, verification and GPS implemented; OTP display and device/frontend integration remain |
| M4 — Payments & Admin | IN_PROGRESS | Razorpay Test Mode, balance gate, Admin portal |
| M5 — Testing & Deployment | IN_PROGRESS | Emulator regression suite and packaged Functions smoke pass; live release checks remain |

---

## Backend implementation checkpoint — 23 November 2026

| Area | Implemented locally | Remaining completion condition |
|---|---|---|
| Foundation and identity | API standards, session, Auth/App Check and roles | Independent review, live App Check, client linking/conflict flow |
| Booking | Quote and booking routes, production eligibility adapter, rate freeze, cancellation/payables, reservation conflicts | Live provider/device configuration and deployed integration checks |
| Trips | Initialization, arrival fallback, verification services, waiting/no-show, final fare/payable and reservation release | Owner-held OTP display/recovery; real device GPS and incident corroboration validation |
| Admin | Manual application queue/decisions, driver controls, customer restore, atomic audits and inbox | Private document/onboarding integration implemented; independent review and deployed Storage access verification |
| Financial records | Completed-trip earning/payable, capture journal, disputes and unpaid corrections | No-trip dispute/qualification/settlement policies and actual capture/refund integration |
| Safety and core records | Approved categories, Demo SOS, verified incident processor, owned profiles/vehicles, private applications/uploads | Incident qualification/exclusions, legal deletion policy and deployed integration remain |
| Mobility and background | Road/eligibility producer, GPS/RTDB, authenticated sharing, terminal/stale cleanup, booking and notification jobs | Live Maps/device validation and cloud deployment |
| Packaging | Independently installed Functions package loads under Node22 | Actual cloud IAM, Secret Manager and deployment checks |

| Verification | Result |
|---|---|
| API and Functions builds/type-checks | Passed locally, including embedded hosting config |
| Packaged Functions HTTP smoke check | Healthy HTTP 200 under Node22 after socket PORT fix |
| Emulator tests | 86 passed, zero failures/skips under Node22 with Auth, Firestore, Storage and RTDB; frontend follow-up adds 15 passing adapter/worker tests |
| Provider integration | One INR1 Razorpay Test Mode order and receipt lookup verified; no payment captured |
| Secrets/config | Local OTP secret generated privately; ADMIN_GRANTER_UID intentionally pending owner input |
| New API contract | OpenAPI (80 paths), frontend integration contract and all three progress records updated |

### Outstanding owner and partner dependencies

| Dependency | Responsible party |
|---|---|
| Secure customer OTP display/delivery and recovery decision | Project owner explicitly left pending |
| Actual lead Firebase UID | Owner will provide later |
| Qualifying incident reasons/exclusions and no-trip disputes | Owner explicitly left pending |
| Profile/vehicle/application producers and web adapters implemented; real credential-linking flow remains to verify | Frontend integration |
| Route/availability/GPS/share APIs and frontend adapters implemented; real provider/device integration remains | Runtime configuration and device tests |
| Webhook secret/configuration, real capture/FCM/App Check and cloud deployment | Runtime/provider configuration and authorized integration testing |

Use the [Team 2 execution register](../../openspec/changes/complete-team2-backend/tasks.md) and [core/mobility follow-up](../../openspec/changes/complete-core-mobility-backend/tasks.md) for per-task evidence. Source is reviewable; end-to-end release completion remains pending the dependencies above.

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
| 1 | Incident counters | AGREED | Project owner | Lifetime counters; qualifying reasons/exclusions remain pending |
| 2 | Data retention durations | OPEN | Project owner | Approach agreed (DEC-11); exact periods needed before real data |
| 3 | Dispute deadline / settlement | PARTIAL | Project owner | Completed trips: 48h; no-trip disputes and settlement rules remain pending |
| 4 | Report and cancellation categories | AGREED | Project owner | Approved initial lists in apps/api/src/config/approved-policies.ts |
| 5 | PER_KM activation criteria | DEFERRED (R1) | Project owner | GPS accuracy benchmarks needed prior to future activation |
| 6 | Firebase region benchmarking | DECIDED | Member 5 | App Hosting (Singapore), Cloud Functions (Hong Kong), Firestore (Mumbai) |

---

## Blockers

| Blocker | Affects | Resolution |
|---|---|---|
| Readiness reconciliation remains pending | Policy and contract reconciliation | Review [`reconcile-project-readiness`](../../openspec/changes/reconcile-project-readiness/tasks.md) before authorized foundation repair |
| Cloud deployment verification | API deployment and background functions | Standalone package dependencies and Node22 HTTP startup pass locally; deployed IAM, secrets and scheduled invocation remain |
| Managed runtime configuration | Backend runtime, deployment | Verify configured project resources, billing, IAM and deployed endpoints |
| Owner-held access and policy decisions | Admin grants, OTP, incident and financial edge cases | Lead UID, secure OTP display/recovery, qualifying incidents and no-trip settlement rules remain pending |

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


## Frontend integration checkpoint — 23 November 2026

| Area | Implementation result | Remaining gate |
|---|---|---|
| API transport and identity | Canonical calls, limited-use App Check, explicit demo mode, no silent fake data | Real provider/linking/App Check verification |
| Core records | Owned atomic vehicle/profile saves, private uploads/photos, applications and coverage | Deployed Storage/IAM and manual review |
| Booking | Server road geometry, current Places API, eligibility, rate caps, quote freshness and lifecycle states | Real Maps keys/restrictions/quotas |
| Trip/driver | Polling, foreground GPS, fresh presence, initialized assignments, customer arrival fallback and active-trip offline guard | Real-device GPS/foreground calibration; owner-held OTP display/recovery |
| Finance/Admin | Verified Test Mode checkout, real ledger/read models, reports/decisions, private document preview/download | Real capture/webhook and pending allocation/settlement policies |
| Inbox/privacy | Owned inbox/read state, persisted opt-outs, authenticated/revocable shares and deletion-review intake | No external notification/emergency or immediate legal-erasure claim |
| Hardening | 96 browser matrix checks passed; keyboard dialog/autocomplete and synthetic instant booking passed | Screen reader/real-device LCP and independent review |

Detailed verification and exact release gates are recorded in [the frontend execution register](../../openspec/changes/complete-frontend-integration/tasks.md). Original frontend ownership remains Team 1; this cross-team integration work was explicitly authorized by the owner. No commit, push or deployment was performed.
