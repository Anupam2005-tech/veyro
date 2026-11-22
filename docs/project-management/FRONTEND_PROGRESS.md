# Veyro — Frontend Progress Tracker

**Last updated:** 22 November 2026
**Stack:** Next.js App Router + React + TypeScript + Tailwind CSS + shadcn/ui + Radix UI  
**Spec reference:** `docs/veyro.md` §2–3, §6 (PROMPT 00–06, 08)  

---

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
| FE-001 | CSS variables and Tailwind theme (Night + Studio Light) | — | REVIEW | Member 1 | FND-006 | CSS vars + Tailwind tokens in `apps/web`; shared preset extended in `packages/config` |
| FE-002 | Typography setup (Syne, Inter, JetBrains Mono) | — | REVIEW | Member 1 | FE-001 | `next/font/google` wired in root layout with fallback stacks |
| FE-003 | AppShell, public header, authenticated nav, bottom nav | — | REVIEW | Member 1 | FE-001 | AppShell, PublicHeader and mobile bottom-nav slot built; authenticated nav content pending FE-014+ |
| FE-004 | VeyroButton variants (lime, obsidian, secondary, destructive) | — | REVIEW | Member 1 | FE-001 | Includes ghost + loading + `asChild`, in `@veyro/ui` |
| FE-005 | StatusBadge, EmptyState, ErrorState, LoadingState | — | REVIEW | Member 1 | FE-001 | Icon + text + colour status semantics |
| FE-006 | HolographicVehiclePass | — | REVIEW | Member 1 | FE-001 | Obsidian holographic card with vehicle details |
| FE-007 | DynamicTripPill, OtpVaultCard | — | REVIEW | Member 1 | FE-001 | OTP display/input states with reveal control and labels |
| FE-008 | DriverOfferCard, FareBreakdown, MapBottomSheet | — | REVIEW | Member 1 | FE-001 | Radix Dialog bottom sheet; breakdown separates exclusions |
| FE-009 | ConfirmDialog, SafetyActionButton | — | REVIEW | Member 1 | FE-001 | Radix ConfirmDialog; SOS shows demo-mode wording |
| FE-010 | `/design-system` gallery page | `/design-system` | REVIEW | Member 1 | FE-004..FE-009 | Both themes demonstrated; 200 in dev smoke test |

### Landing page (PROMPT 01)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-011 | Hero section with CTAs | VIEW-01 `/` | REVIEW | Member 1 | FE-001 | Animated SVG route ribbon, static + reduced-motion fallback; CTAs to `/auth?role=customer` and `/auth?role=driver` |
| FE-012 | How-it-works, instant vs scheduled, vehicle explainer | VIEW-01 `/` | REVIEW | Member 1 | FE-011 | Approved 5-min / 4h–30d / 15 km copy; no assignment-before-acceptance claim |
| FE-013 | Fare/safety, trip verification, FAQ, footer | VIEW-01 `/` | REVIEW | Member 1 | FE-011 | Approved policy constants only; demo SOS wording; Radix FAQ; legal routes added |

### Authentication & onboarding (PROMPT 02)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-014 | `/auth` — role selection, email-link, phone OTP, Google | VIEW-02 `/auth` | REVIEW | Member 2 | FE-001, BE-001 | Veyro Night. Firebase JS SDK 13.3.0 wired with real Auth + labelled demo fallback; email-link callback route added. tsc, eslint, build and route smoke passed. |
| FE-015 | Provider linking, error/loading states | VIEW-02 `/auth` | REVIEW | Member 2 | FE-014 | Account-exists linking, popup/redirect fallback, resend cooldown, field/error states, safe return URL. Verified with lint/build/smoke. |
| FE-016 | `/onboarding/customer` — profile + optional vehicle | VIEW-03 | REVIEW | Member 2 | FE-014, BE-005 | Studio Light. Required name/phone/consent, optional vehicle, demo persistence adapter. tsc, eslint, build and `/onboarding/customer` smoke passed. |
| FE-017 | `/onboarding/driver` — 4-step flow with doc upload | VIEW-04 | REVIEW | Member 4 | FE-014, BE-008 | Studio Light. Four steps, HOURLY only, disabled PER_KM, private Storage upload path with validation/progress, PENDING_REVIEW submit. Verified. |

---

## M2 — Core Booking Flow

### Customer booking (PROMPT 03)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-018 | Booking studio — location, route, map | VIEW-05 `/customer` | REVIEW | Member 2 | FE-001, BE-011 | Studio Light map-first layout with draggable pins, debounced road-route preview, route failure gate and Google/demo provider adapter. tsc, eslint, build and `/customer` smoke passed. |
| FE-019 | Vehicle pass, driver search/cards | VIEW-05 `/customer` | REVIEW | Member 2 | FE-018 | Vehicle pass uses category + transmission only; eligible-driver cards, filters, sorting, radius expansion and scheduled count-only mode added. Verified. |
| FE-020 | Quote/confirm flow, instant vs scheduled | VIEW-05 `/customer` | REVIEW | Member 2 | FE-019, BE-012 | HOURLY-only server-shaped quote, frozen quote snapshot, policy version, exclusions, unpaid-balance gate and 5-minute/12h–2h timelines. Demo adapter labelled. |
| FE-021 | Booking hub — upcoming, active, past | VIEW-08 `/customer/bookings` | REVIEW | Member 2 | FE-020 | Booking groups, frozen quote display, cancellation reason dialog and empty/loading/error states added. tsc, eslint, build and `/customer/bookings` smoke passed. |
| FE-022 | Customer profile, vehicles, emergency contacts | VIEW-09 `/customer/profile` | REVIEW | Member 2 | FE-016 | Editable profile, vehicle list and emergency contacts with validation and demo persistence. tsc, eslint, build and `/customer/profile` smoke passed. |

### Driver dashboard (PROMPT 05)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-023 | Driver application status page | VIEW-11 `/driver/status` | REVIEW | Member 4 | FE-017 | All five statuses with Admin reason, resubmit, private document list and demo state previews. tsc, eslint, build and route smoke passed. |
| FE-024 | Online/offline toggle, GPS state, offer cards | VIEW-12 `/driver` | REVIEW | Member 4 | FE-023, BE-010 | Online eligibility checks, GPS freshness/permission, instant five-minute offer timer, scheduled broadcast details and accept/decline states with demo fixtures. |
| FE-025 | Driver profile, rates, capabilities | VIEW-15 `/driver/profile` | REVIEW | Member 4 | FE-023 | Editable driver profile, private document metadata, read-only rate with future-booking copy and safety incident summary. |

---

## M3 — Trip Lifecycle & Maps

### Customer trip (PROMPT 04)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-026 | Trip cockpit — all states | VIEW-06 `/customer/trips/[id]` | REVIEW | Member 2 | FE-020, BE-016 | Awaiting, en route, arrived/waiting, active and completed states with labelled demo state previews. |
| FE-027 | Live location, stale GPS handling | VIEW-06 `/customer/trips/[id]` | REVIEW | Member 3 | FE-026, BE-019 | Active-trip location marker, 30-second stale freeze, last-updated timestamp and interruption warning. |
| FE-028 | OTP display (start + end) | VIEW-06 `/customer/trips/[id]` | REVIEW | Member 2 | FE-026 | Separate revealable start and end codes; never logged or placed in a URL. |
| FE-029 | SOS action (demo mode wording) | VIEW-06 `/customer/trips/[id]` | REVIEW | Member 2 | FE-026, BE-026 | One-tap demo SOS with per-contact unconfirmed states and explicit no-external-message wording. |
| FE-030 | Trip sharing (create, revoke) | VIEW-10 `/share/[token]` | REVIEW | Member 2 | FE-026, BE-020 | Random token, hashed demo storage, auth-required read-only view, expiry and customer revoke control. |
| FE-031 | Receipt, rating, report | VIEW-07 `/customer/trips/[id]/summary` | REVIEW | Member 2 | FE-026, BE-021 | Estimate vs final, pricing mode, billable time/distance, exclusions, rating and predefined report form. |

### Driver trip (PROMPT 05)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-032 | Driver trip cockpit — map, arrival, OTP numpads | VIEW-13 `/driver/trips/[id]` | REVIEW | Member 4 | FE-024, BE-016 | Route map, next-turn banner, re-centre, Maps fallback, arrival, waiting policy, no-show request and separate six-digit OTP inputs. |
| FE-033 | Driver earnings ledger | VIEW-14 `/driver/earnings` | REVIEW | Member 4 | FE-032, BE-021 | Clearly labelled demo ledger with gross, waiting credits, commission, adjustments, net and rate-effective copy. |

### Maps integration

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-034 | Google Maps provider adapter | — | REVIEW | Member 3 | FND-006 | Provider interface with Google script/Places/Directions/Geocoder implementation and labelled demo fallback. Live Google path activates only with `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. |
| FE-035 | Places autocomplete, route preview, driver markers | VIEW-05 | REVIEW | Member 3 | FE-034, FE-018 | Custom place search, 400ms debounced route preview, draggable pins, reverse geocoding and demo driver markers wired into the booking studio. |
| FE-036 | Active trip map with live location | VIEW-06, VIEW-13 | REVIEW | Member 3 | FE-034, FE-027 | Shared RouteMap used in both cockpits with driver marker, route line and stale-state freeze. |

---

## M4 — Payments & Admin

### Payments

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-037 | Razorpay checkout integration | VIEW-07 | REVIEW | Member 2 | FE-031, BE-021 | Test Mode only. Demo checkout updates payment state to verification pending; no live gateway key is configured. |
| FE-038 | Outstanding balance gate | VIEW-05 | REVIEW | Member 2 | FE-037, BE-024 | Demo preview via `?balance=1`; disputed amount under review excluded from blocking balance. |

### Admin (PROMPT 06)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-039 | Admin overview, KPI cards, application queue | VIEW-16 `/admin` | REVIEW | Member 5 | FE-001, BE-030 | KPI cards plus searchable/status-filterable application queue. |
| FE-040 | Application review — document viewer, approve/reject | VIEW-17 `/admin/applications/[id]` | REVIEW | Member 5 | FE-039, BE-030 | Private document metadata with presigned-only copy, mandatory reason decisions and audit trail. |
| FE-041 | Reports directory, resolution | VIEW-18 `/admin/reports` | REVIEW | Member 5 | FE-039, BE-033 | Report list with status filter, detail panel, Under Review/Resolve/Dismiss with required notes and confirmation dialogs. |
| FE-042 | Driver/customer safety controls (suspend/restore) | VIEW-17 | REVIEW | Member 5 | FE-040, BE-031 | Driver deactivate/restore with mandatory audit reason and incident context. Customer restore endpoint remains backend-dependent. |


---

## M5 — Testing & Hardening (PROMPT 08)

| Task ID | Description | Status | Owner | Notes |
|---|---|---|---|---|
| FE-043 | Accessibility audit (keyboard, focus, contrast, labels) | REVIEW | Member 1 | Static WCAG pass: focus/error tokens, skip link, icon labels, form semantics, combobox/tab semantics, map pin keyboard support, reduced motion; screen-reader pass pending. |
| FE-044 | Responsive checks (320px–desktop) | REVIEW | Member 1 | OTP/vehicle/marker layouts made 320px-safe; real-device 320/360/390/tablet/desktop pass pending. |
| FE-045 | PWA manifest, service worker, install prompt | REVIEW | Member 1 | Manifest, offline fallback, production service worker registration and install affordance wired with existing icons. |
| FE-046 | Performance (LCP ≤2.5s, JS budget ≤220KB gzipped) | REVIEW | All | Lazy motion/map/Firebase chunks; build First Load JS max 183 kB; real Android/4G LCP still pending. |

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
| FE-047 | Favourite driver save and favourites booking tab | VIEW-07, VIEW-08 | REVIEW | Device-local favourites saved from completed-trip receipts and surfaced in `/customer/bookings`; backend persistence remains out of scope. |
| FE-048 | Notification and privacy controls | VIEW-09 `/customer/profile` | REVIEW | Typed preferences saved with the customer profile adapter and labelled demo behaviour. |
| FE-049 | Customer status detail and audited restore | VIEW-17 `/admin/customers`, `/admin/customers/[id]` | REVIEW | Suspension reason, cancellation incident history and mandatory restore audit reason; real restore still needs the approval backend endpoint. |
| FE-050 | Driver report form | VIEW-13 `/driver/trips/[id]` | REVIEW | Completed-trip report submission reuses the approved categories and anonymous copy. |
| FE-051 | Admin driver lookup and incident timeline | VIEW-18 `/admin/reports`, VIEW-17 review | REVIEW | Driver search across application ID/name/phone and incident history on application review. |
| FE-052 | Application list route and nav fixes | `/admin/applications`, AdminShell | REVIEW | Removed hardcoded navigation IDs and added an application directory. |
| FE-053 | Dynamic driver active-trip nav and driver contact placeholder | DriverShell, `/driver/trips/[id]` | REVIEW | Active trip link derives from driver profile; call/message remain visibly unavailable pending backend handoff. |
| FE-054 | Outstanding-fare settlement and payment states | `/customer`, receipt | REVIEW | Sticky Settle Previous Fare action with confirmation, plus refund-pending and review-required payment copy. |

Scope: user-requested UI gaps inside existing routes. No backend, Functions, infra or contract files were modified.

Delivered: favourites tab and receipt toggle, customer notification/privacy preference sections, admin application directory and customer status/detail routes, customer restore dialog with audit reason, driver report form and contact placeholder, admin driver lookup and incident timeline, dynamic driver active-trip navigation, sticky outstanding-fare settlement action, and the missing `REFUND_PENDING`/`REVIEW_REQUIRED` payment states.

Evidence: `tsc --noEmit` passed for `apps/web` and `packages/ui`; ESLint passed on `apps/web/src`; `next build` passed with 23 routes and a maximum First Load JS of 183 kB on `/auth` (landing 132 kB). Production smoke test returned 200 for 21 routes including the new `/admin/applications`, `/admin/customers` and `/admin/customers/CUST-2041` paths.

Not yet verified: real backend persistence for favourites/preferences, customer restore and driver reports; live Razorpay settlement verification; real-device LCP and manual a11y/responsive walkthroughs. Statuses are `REVIEW`, not `DONE`, pending independent review and merge.

