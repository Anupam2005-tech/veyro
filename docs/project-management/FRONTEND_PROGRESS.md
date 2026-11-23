# Veyro — Frontend Progress Tracker

**Last updated:** 23 November 2026
**Stack:** Next.js App Router + React + TypeScript + Tailwind CSS + shadcn/ui + Radix UI  
**Spec reference:** `docs/veyro.md` §2–3, §6 (PROMPT 00–06, 08)  

---

## Runtime repair — 22 November 2026

| Change | Status | Evidence |
|---|---|---|
| Stale Next.js chunk cleanup | REVIEW | Web type-check passed. Headless Chrome hydrated the landing page with zero runtime exceptions. A seeded worker and old shell cache were removed on development reload. Original affected browser confirmation pending. [OpenSpec](../../openspec/changes/fix-stale-web-chunks/tasks.md) |

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

## M1 — Design System & Authentication

### Design system (PROMPT 00)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-001 | CSS variables and Tailwind theme (Night + Studio Light) | — | REVIEW | Team 1 — Sid / Nishan | FND-006 | CSS vars + Tailwind tokens in `apps/web`; shared preset extended in `packages/config` |
| FE-002 | Typography setup (Syne, Inter, JetBrains Mono) | — | REVIEW | Team 1 — Sid / Nishan | FE-001 | `next/font/google` wired in root layout with fallback stacks |
| FE-003 | AppShell, public header, authenticated nav, bottom nav | — | REVIEW | Team 1 — Sid / Nishan | FE-001 | AppShell, PublicHeader and mobile bottom-nav slot built; authenticated nav content pending FE-014+ |
| FE-004 | VeyroButton variants (lime, obsidian, secondary, destructive) | — | REVIEW | Team 1 — Sid / Nishan | FE-001 | Includes ghost + loading + `asChild`, in `@veyro/ui` |
| FE-005 | StatusBadge, EmptyState, ErrorState, LoadingState | — | REVIEW | Team 1 — Sid / Nishan | FE-001 | Icon + text + colour status semantics |
| FE-006 | HolographicVehiclePass | — | REVIEW | Team 1 — Sid / Nishan | FE-001 | Obsidian holographic card with vehicle details |
| FE-007 | DynamicTripPill, OtpVaultCard | — | REVIEW | Team 1 — Sid / Nishan | FE-001 | OTP display/input states with reveal control and labels |
| FE-008 | DriverOfferCard, FareBreakdown, MapBottomSheet | — | REVIEW | Team 1 — Sid / Nishan | FE-001 | Radix Dialog bottom sheet; breakdown separates exclusions |
| FE-009 | ConfirmDialog, SafetyActionButton | — | REVIEW | Team 1 — Sid / Nishan | FE-001 | Radix ConfirmDialog; SOS shows demo-mode wording |
| FE-010 | `/design-system` gallery page | `/design-system` | REVIEW | Team 1 — Sid / Nishan | FE-004..FE-009 | Both themes demonstrated; 200 in dev smoke test |

### Landing page (PROMPT 01)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-011 | Hero section with CTAs | VIEW-01 `/` | REVIEW | Team 1 — Sid / Nishan | FE-001 | Animated SVG route ribbon, static + reduced-motion fallback; CTAs to `/auth?role=customer` and `/auth?role=driver` |
| FE-012 | How-it-works, instant vs scheduled, vehicle explainer | VIEW-01 `/` | REVIEW | Team 1 — Sid / Nishan | FE-011 | Approved 5-min / 4h–30d / 15 km copy; no assignment-before-acceptance claim |
| FE-013 | Fare/safety, trip verification, FAQ, footer | VIEW-01 `/` | REVIEW | Team 1 — Sid / Nishan | FE-011 | Approved policy constants only; demo SOS wording; Radix FAQ; legal routes added |

### Authentication & onboarding (PROMPT 02)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-014 | `/auth` — role selection, email-link, phone OTP, Google | VIEW-02 `/auth` | REVIEW | Team 1 — Sid / Nishan | FE-001, BE-001 | Live session failures are surfaced; demo mode requires an explicit environment flag. Every API request sends Auth and a fresh limited-use App Check token. |
| FE-015 | Provider linking, error/loading states | VIEW-02 `/auth` | REVIEW | Team 1 — Sid / Nishan | FE-014 | Existing linking/conflict UI retained; user changes remount private screen state. Actual configured-provider and App Check verification remains a release check. |
| FE-016 | `/onboarding/customer` — profile + optional vehicle | VIEW-03 | REVIEW | Team 1 — Sid / Nishan | FE-014, BE-005 | Owned canonical onboarding and optional vehicle flow wired; missing vehicle blocks booking with a profile link. |
| FE-017 | `/onboarding/driver` — 4-step flow with doc upload | VIEW-04 | REVIEW | Team 1 — Sid / Nishan | FE-014, BE-008 | Private uploads and reviewed pickup coverage. Service-area search uses live Google Places in connected builds and supports multiple removable selections. |

---

## M2 — Core Booking Flow

### Customer booking (PROMPT 03)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-018 | Booking studio — location, route, map | VIEW-05 `/customer` | REVIEW | Team 1 — Sid / Nishan | FE-001, BE-011 | Canonical server road preview/geometry, ordered waypoints, draggable pins, modern Places suggestions and explicit error states. |
| FE-019 | Vehicle pass, driver search/cards | VIEW-05 `/customer` | REVIEW | Team 1 — Sid / Nishan | FE-018 | Approved directory plus server eligibility; filters, explicit radius expansion and scheduled count/cap. Live driver coordinates are not fabricated. |
| FE-020 | Quote/confirm flow, instant vs scheduled | VIEW-05 `/customer` | REVIEW | Team 1 — Sid / Nishan | FE-019, BE-012 | Server quote ID/fare, scheduled rate cap and null selected driver, pickup binding, stale-input/expiry confirmation guards; failures never create demo bookings. |
| FE-021 | Booking hub — upcoming, active, past | VIEW-08 `/customer/bookings` | REVIEW | Team 1 — Sid / Nishan | FE-020 | Participant read models and polling; queued/broadcasting/expired/NEEDS_REBOOK states preserved. Approved cancellation codes wired. |
| FE-022 | Customer profile, vehicles, emergency contacts | VIEW-09 `/customer/profile` | REVIEW | Team 1 — Sid / Nishan | FE-016 | Validated atomic profile/vehicle saves, ownership and reservation locks, server IDs, emergency contacts, private avatar proxy and deletion-review intake. |

### Driver dashboard (PROMPT 05)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-023 | Driver application status page | VIEW-11 `/driver/status` | REVIEW | Team 1 — Sid / Nishan | FE-017 | Canonical application status/reason/resubmission; live query parameters cannot activate demo state previews. |
| FE-024 | Online/offline toggle, GPS state, offer cards | VIEW-12 `/driver` | REVIEW | Team 1 — Sid / Nishan | FE-023, BE-010 | Foreground GPS on online toggle, 15-second presence renewal, open-offer polling, scheduled decline and retry-safe acceptance/trip initialization. |
| FE-025 | Driver profile, rates, capabilities | VIEW-15 `/driver/profile` | REVIEW | Team 1 — Sid / Nishan | FE-023 | Owned profile and future hourly-rate/transmission edits; capability/identity/coverage changes require review. Existing rates remain frozen for assigned work. |

---

## M3 — Trip Lifecycle & Maps

### Customer trip (PROMPT 04)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-026 | Trip cockpit — all states | VIEW-06 `/customer/trips/[id]` | REVIEW | Team 1 — Sid / Nishan | FE-020, BE-016 | Owned booking/trip read models, server actions, polling and customer-confirmed arrival fallback. Demo-only previews remain separate. |
| FE-027 | Live location, stale GPS handling | VIEW-06 `/customer/trips/[id]` | REVIEW | Team 1 — Sid / Nishan | FE-026, BE-019 | Latest authorized GPS, 30-second stale state, frozen last-known marker and visible timestamps; device calibration remains pending. |
| FE-028 | OTP display (start + end) | VIEW-06 `/customer/trips/[id]` | BLOCKED | Team 1 — Sid / Nishan | FE-026 | Owner explicitly held secure OTP display/delivery/recovery. Live UI shows pending setup and no invented code; demo vaults are explicitly gated. |
| FE-029 | SOS action (demo mode wording) | VIEW-06 `/customer/trips/[id]` | REVIEW | Team 1 — Sid / Nishan | FE-026, BE-026 | Canonical idempotent Demo SOS intake; truthful no-external-dispatch notice. Live external emergency delivery remains outside Release 1. |
| FE-030 | Trip sharing (create, revoke) | VIEW-10 `/share/[token]` | REVIEW | Team 1 — Sid / Nishan | FE-026, BE-020 | Hash-ID revoke, token only in X-Trip-Share API header, authenticated minimal read, polling and end/revocation denial; replacing links revokes previous tokens. |
| FE-031 | Receipt, rating, report | VIEW-07 `/customer/trips/[id]/summary` | REVIEW | Team 1 — Sid / Nishan | FE-026, BE-021 | Server fare/payment mapping, completed-trip rating and approved report taxonomy. Only verified capture is displayed as paid. |

### Driver trip (PROMPT 05)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-032 | Driver trip cockpit — map, arrival, OTP numpads | VIEW-13 `/driver/trips/[id]` | REVIEW | Team 1 — Sid / Nishan | FE-024, BE-016 | Canonical arrival/start/complete/no-show actions, phase code payloads, foreground GPS relay and polling. OTP display remains owner-held. |
| FE-033 | Driver earnings ledger | VIEW-14 `/driver/earnings` | REVIEW | Team 1 — Sid / Nishan | FE-032, BE-021 | Own ledger read model includes waiting/adjustment facts; pending allocations excluded. Live payout/settlement policy remains pending. |

### Maps integration

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-034 | Google Maps provider adapter | — | REVIEW | Team 1 — Sid / Nishan | FND-006 | Modern Places autocomplete with session tokens and selection-only details; live road previews use server Routes API instead of legacy browser Directions. |
| FE-035 | Places autocomplete, route preview, driver markers | VIEW-05 | REVIEW | Team 1 — Sid / Nishan | FE-034, FE-018 | Keyboard-operable suggestions, canonical waypoint ordering, explicit search expansion, no synthetic live driver markers. |
| FE-036 | Active trip map with live location | VIEW-06, VIEW-13 | REVIEW | Team 1 — Sid / Nishan | FE-034, FE-027 | Google Map driver overlays update without rebuilding the map; stale markers are distinct. Real map/device calibration remains pending. |

---

## M4 — Payments & Admin

### Payments

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-037 | Razorpay checkout integration | VIEW-07 | REVIEW | Team 1 — Sid / Nishan | FE-031, BE-021 | Uses the server amount and reuses the invoice's order. Receipts show confirmed, failed and pending states with a status check. Staging Test Mode capture/webhook remains pending. |
| FE-038 | Outstanding balance gate | VIEW-05 | REVIEW | Team 1 — Sid / Nishan | FE-037, BE-024 | Balance comes from confirmed, non-disputed payables; settlement uses the actual unpaid invoice. Demo balance previews cannot affect live screens. |

### Admin (PROMPT 06)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-039 | Admin overview, KPI cards, application queue | VIEW-16 `/admin` | REVIEW | Team 1 — Sid / Nishan | FE-001, BE-030 | Authorized joined application queue and real count queries; no nonexistent /admin/overview call. |
| FE-040 | Application review — document viewer, approve/reject | VIEW-17 `/admin/applications/[id]` | REVIEW | Team 1 — Sid / Nishan | FE-039, BE-030 | Immutable authorized document preview/download, reviewed coverage, canonical decisions, stable retry keys and reasoned audit. |
| FE-041 | Reports directory, resolution | VIEW-18 `/admin/reports` | REVIEW | Team 1 — Sid / Nishan | FE-039, BE-033 | Canonical report DTOs and UNDER_REVIEW/RESOLVED/DISMISSED transitions; each stage is audited and notified once. |
| FE-042 | Driver/customer safety controls (suspend/restore) | VIEW-17 | REVIEW | Team 1 — Sid / Nishan | FE-040, BE-031 | Canonical driver control and customer restore, active Admin checks, mandatory reasons and stable retry identity. |


---

## M5 — Testing & Hardening (PROMPT 08)

| Task ID | Description | Status | Owner | Notes |
|---|---|---|---|---|
| FE-043 | Accessibility audit (keyboard, focus, contrast, labels) | REVIEW | Team 1 — Sid / Nishan | Automated accessible-name and dialog keyboard checks; focus restoration fixed. Full screen-reader/contrast audit remains a release check. |
| FE-044 | Responsive checks (320px–desktop) | REVIEW | Team 1 — Sid / Nishan | 96 browser checks passed at 320/390/768/1440px with zero overflow/runtime errors/unnamed buttons; shared Admin header fixed at 768px. |
| FE-045 | PWA manifest, service worker, install prompt | REVIEW | Team 1 — Sid / Nishan | Manifest, offline fallback, production service worker registration and install affordance wired with existing icons. |
| FE-046 | Performance (LCP ≤2.5s, JS budget ≤220KB gzipped) | REVIEW | All | Production build passes; final First Load JS measurement below. Real Android/4G LCP remains unmeasured. |

---

## Frontend pass — 22 November 2026

Scope: FE-001–FE-013 only. No backend, Functions, infra or contract files were modified.

Evidence: `tsc --noEmit` passed for `apps/web`, `packages/ui` and `packages/config`; ESLint passed on `apps/web/src`; `next build` passed with `/`, `/design-system` and three static `/legal/*` routes; dev smoke test returned 200 for all five routes and the rendered landing HTML contained the required headline, CTA and safety copy.

Not yet verified: real-device LCP, 320px manual responsive pass, keyboard/screen-reader audit (FE-043–FE-046 remain `NOT_STARTED`). Statuses above are `REVIEW`, not `DONE`, pending independent review and merge.

## Frontend pass — 22 November 2026 (customer booking)

Scope: FE-018–FE-022 and FE-034–FE-035. No backend, Functions, infra or contract files were modified.

Evidence: `tsc --noEmit` passed for `apps/web` and `packages/ui`; ESLint passed on `apps/web/src`; `next build` passed with `/customer`, `/customer/bookings` and `/customer/profile` added; dev smoke test returned 200 for all three customer routes. Live Google Maps is not exercised locally because no browser key is configured; the labelled demo provider supplies deterministic road-style routes, places and driver fixtures.

Not yet verified: live Google Maps key/quota setup, real backend quote/booking endpoints, real-device map performance and the 320px/keyboard audit. Statuses are `REVIEW`, not `DONE`, pending independent review and merge.

## Frontend pass — 22 November 2026 (trip lifecycle and Admin)

Scope: FE-024–FE-025, FE-026–FE-033, FE-036–FE-042. No backend, Functions, infra or contract files were modified.

Delivered: `/driver`, `/driver/trips/[id]`, `/driver/earnings`, `/driver/profile`, `/customer/trips/[id]`, `/customer/trips/[id]/summary`, `/share/[token]`, `/admin`, `/admin/applications/[id]` and `/admin/reports`. Added typed demo adapters for trips, offers, earnings, shares, ratings, reports and admin review; all real-mode calls use distinct API paths with bearer tokens and demo fallbacks only when `NEXT_PUBLIC_VEYRO_DEMO_MODE`/missing API base selects demo data.

Evidence: `tsc --noEmit` passed for `apps/web` and `packages/ui`; ESLint passed on `apps/web/src`; `next build` passed with all new routes; dev smoke test returned 200 for the new driver, customer trip, share and admin routes. SOS, payments, share-token hashing, document URLs and GPS are clearly labelled demo behaviour; live backend/Razorpay/Google Maps and customer restore endpoint are not exercised.

Not yet verified: real backend state machines, real Razorpay test key flow, live Google Maps key/quota, 320px manual responsive pass, keyboard/screen-reader audit and LCP/JS budget. Statuses are `REVIEW`, not `DONE`, pending independent review and merge. FE-043–FE-046 are `REVIEW` after the hardening pass below.

## Frontend pass — 22 November 2026 (testing and hardening)

Scope: FE-043–FE-046. No backend, Functions, infra or contract files were modified.

Delivered: theme-aware focus/error/status tokens, skip link, icon-only control names, form required/error wiring, non-tab sign-in method buttons, labelled place suggestions, keyboard-adjustable map pins, reduced-motion safety, 320px-safe OTP/vault/vehicle layouts, PWA manifest, offline fallback, production service worker registration, lazy motion/map/Firebase chunks, and labelled install affordance.

Evidence: `tsc --noEmit` passed for `apps/web` and `packages/ui`; ESLint passed on `apps/web/src`; `next build` passed with 21 routes and a maximum First Load JS of 183 kB on `/auth` (landing 132 kB). Production smoke test returned 200 for `/`, `/manifest.webmanifest`, `/sw.js`, `/offline.html`, all driver/customer/share/admin routes and `/auth?role=customer`. Build budget is under 220 kB; real-device LCP was not measured.

Not yet verified: real screen-reader walkthrough, focus return after dialog close, 320/360/390/tablet/desktop manual pass with a real browser, reduced-motion pass with the OS setting enabled, mid-range Android/4G LCP, live map load behaviour, GPS freshness and PWA permission states. Statuses are `REVIEW`, not `DONE`, pending independent review and merge.

## Frontend pass — 22 November 2026 (missing UI completion)

| Task ID | Description | View/Route | Status | Notes |
|---|---|---|---|---|
| FE-047 | Favourite driver save and favourites booking tab | VIEW-07, VIEW-08 | REVIEW | Favourites are now saved through the authenticated backend, with an owned profile list. |
| FE-048 | Notification and privacy controls | VIEW-09 `/customer/profile` | REVIEW | Validated preference persistence; sharing opt-out revokes links and configured push categories respect opt-outs. Optional analytics/personalisation remain inactive in R1. |
| FE-049 | Customer status detail and audited restore | VIEW-17 `/admin/customers`, `/admin/customers/[id]` | REVIEW | Authorized customer list/detail, verified incident history and audited restore connected. |
| FE-050 | Driver report form | VIEW-13 `/driver/trips/[id]` | REVIEW | Driver report uses approved categories, participant authorization and a retry-stable idempotency key. |
| FE-051 | Admin driver lookup and incident timeline | VIEW-18 `/admin/reports`, VIEW-17 review | REVIEW | Joined driver/application and verified incident records replace preview-only histories. |
| FE-052 | Application list route and nav fixes | `/admin/applications`, AdminShell | REVIEW | Application list and navigation use canonical records; tablet navigation overflow fixed. |
| FE-053 | Dynamic driver active-trip nav and driver contact placeholder | DriverShell, `/driver/trips/[id]` | REVIEW | Active trip derives from owned booking state. Driver/customer contact details remain unavailable pending an approved contact-sharing contract. |
| FE-054 | Outstanding-fare settlement and payment states | `/customer`, receipt | REVIEW | Payable ID, retry, verified status, and balance refresh after capture. Cancellation charges no longer depend on reading a completed-trip receipt. Refund operations remain provider/policy-gated. |

Scope: user-requested UI gaps inside existing routes. No backend, Functions, infra or contract files were modified.

Delivered: favourites tab and receipt toggle, customer notification/privacy preference sections, admin application directory and customer status/detail routes, customer restore dialog with audit reason, driver report form and contact placeholder, admin driver lookup and incident timeline, dynamic driver active-trip navigation, sticky outstanding-fare settlement action, and the missing `REFUND_PENDING`/`REVIEW_REQUIRED` payment states.

Evidence: `tsc --noEmit` passed for `apps/web` and `packages/ui`; ESLint passed on `apps/web/src`; `next build` passed with 23 routes and a maximum First Load JS of 183 kB on `/auth` (landing 132 kB). Production smoke test returned 200 for 21 routes including the new `/admin/applications`, `/admin/customers` and `/admin/customers/CUST-2041` paths.

Not yet verified: real backend persistence for favourites/preferences, customer restore and driver reports; live Razorpay settlement verification; real-device LCP and manual a11y/responsive walkthroughs. Statuses are `REVIEW`, not `DONE`, pending independent review and merge.


## Canonical frontend integration — 23 November 2026

The owner authorized a complete frontend/backend integration review. This checkpoint supersedes earlier demo-only handoff notes. Source remains REVIEW until independent review and merge. Original frontend ownership stays with Sid/Nishan.

| Work | Status | Evidence / remaining gate |
|---|---|---|
| FE-014–027, FE-029–042, FE-047–054 | REVIEW | Canonical requests/read models, validated mutations, polling, private files and Test Mode checkout implemented |
| FE-028 | BLOCKED | Secure customer OTP delivery/recovery intentionally held by owner |
| Notification inbox and deletion review | REVIEW | Added actual inbox/read controls in all shells and customer deletion-request intake; no external message or immediate erasure claim |
| FE-043–044 | REVIEW | 96 responsive/runtime checks pass; dialog focus/Escape/trap, keyboard autocomplete and synthetic booking flow pass; full screen-reader walkthrough remains pending |
| FE-045 | REVIEW | Existing PWA preserves public shell/static-only caching; private API data is not cached |
| FE-046 | REVIEW | Build budget checked locally; real-device LCP/4G remains pending |

Use the [frontend integration execution register](../../openspec/changes/complete-frontend-integration/tasks.md) for exact final verification and release gates.

| Additional integration evidence | Result |
|---|---|
| Backend / frontend regression | 86 backend + 15 frontend tests passed, zero failures/skips |
| Browser matrix | 96 main checks + 24 latest-build follow-ups passed; no redirects, overflow, runtime exceptions or unnamed visible buttons |
| Keyboard / booking workflow | Dialog trap/Escape/focus return, autocomplete selection and synthetic instant booking passed |
| Push opt-in | Deferred SDK/device registration, explicit permission choice, opt-out/sign-out cleanup and generic worker notification; unconfigured/denied permission keeps inbox usable |
| Standalone runtime | Packaged Functions HTTP200 under Node22; eight exports loaded |

[Detailed verification and reproducible commands](verification/2026-11-23-frontend-integration.md). Full screen-reader and real-device/provider release checks remain pending.

| Driver follow-up | Status | Result |
|---|---|---|
| FE-017 pickup zone | REVIEW | Search for any supported address or locality, or use current location. The selected point and radius define coverage. |
| FE-023 approval | REVIEW | Approved drivers leave application status for the dashboard. Admin decision controls appear only while an application is pending. |
| Driver availability and offers | REVIEW | The dashboard loads approval and availability independently of offers. The offers route reads addressed open bookings if the collection-group index is missing. |
| Driver profile menu | REVIEW | Logo-led navbar with profile/fare editing, privacy, sign-out and deletion request. Rate edits persist on the backend. |
| Driver visibility and notifications | REVIEW | Foreground driver screens renew approved availability. Customer search checks fresh presence and booking criteria. Customer, Driver and Admin inboxes and push enrolment are scoped to the workspace. |
