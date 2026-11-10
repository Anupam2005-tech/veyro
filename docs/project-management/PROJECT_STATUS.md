# Veyro — Project Status

**Last updated:** 9 November 2026  
**Release:** 1.0 (College Capstone)  
**Spec versions:** Unified Specification v3.6 / Backend Technical Specification v1.3  

---

## Current milestone

| Milestone | Status | Target |
|---|---|---|
| M0 — Repository & Scaffold | IN_PROGRESS | Monorepo structure, root configs, trackers |
| M1 — Design System & Auth | NOT_STARTED | Shared tokens, components, passwordless auth |
| M2 — Core Booking Flow | NOT_STARTED | Vehicle pass, instant/scheduled quotes & bookings |
| M3 — Trip Lifecycle & Maps | NOT_STARTED | Arrival, OTP verification, live GPS tracking |
| M4 — Payments & Admin | NOT_STARTED | Razorpay Test Mode, balance gate, Admin portal |
| M5 — Testing & Deployment | NOT_STARTED | Automated test suite, manual release checklist |

---

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
| Monorepo scaffold incomplete | All feature development | M0 completion required before parallel coding |
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
| FND-007 | Create `apps/api/` Express + TypeScript project | NOT_STARTED | Member 5 | FND-004 |
| FND-008 | Create `functions/` Cloud Functions project | NOT_STARTED | Member 5 | FND-004 |
| FND-009 | Create `packages/contracts/` shared types | NOT_STARTED | Member 5 | FND-004 |
| FND-010 | Create `packages/ui/` shared components package | NOT_STARTED | Member 1 | FND-004 |
| FND-011 | Create `packages/config/` shared lint/tsconfig/tailwind | NOT_STARTED | Member 1 | FND-004 |
| FND-012 | Create `.env.example` (web + api) | NOT_STARTED | Member 5 | FND-004 |
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

