# Veyro — Frontend Progress Tracker

**Last updated:** 9 November 2026  
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
| FE-001 | CSS variables and Tailwind theme (Night + Studio Light) | — | NOT_STARTED | Member 1 | FND-006 | Spec §2.2, §2.3 |
| FE-002 | Typography setup (Syne, Inter, JetBrains Mono) | — | NOT_STARTED | Member 1 | FE-001 | |
| FE-003 | AppShell, public header, authenticated nav, bottom nav | — | NOT_STARTED | Member 1 | FE-001 | |
| FE-004 | VeyroButton variants (lime, obsidian, secondary, destructive) | — | NOT_STARTED | Member 1 | FE-001 | |
| FE-005 | StatusBadge, EmptyState, ErrorState, LoadingState | — | NOT_STARTED | Member 1 | FE-001 | |
| FE-006 | HolographicVehiclePass | — | NOT_STARTED | Member 1 | FE-001 | |
| FE-007 | DynamicTripPill, OtpVaultCard | — | NOT_STARTED | Member 1 | FE-001 | |
| FE-008 | DriverOfferCard, FareBreakdown, MapBottomSheet | — | NOT_STARTED | Member 1 | FE-001 | |
| FE-009 | ConfirmDialog, SafetyActionButton | — | NOT_STARTED | Member 1 | FE-001 | |
| FE-010 | `/design-system` gallery page | `/design-system` | NOT_STARTED | Member 1 | FE-004..FE-009 | |

### Landing page (PROMPT 01)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-011 | Hero section with CTAs | VIEW-01 `/` | NOT_STARTED | Member 1 | FE-001 | Veyro Night theme |
| FE-012 | How-it-works, instant vs scheduled, vehicle explainer | VIEW-01 `/` | NOT_STARTED | Member 1 | FE-011 | |
| FE-013 | Fare/safety, trip verification, FAQ, footer | VIEW-01 `/` | NOT_STARTED | Member 1 | FE-011 | |

### Authentication & onboarding (PROMPT 02)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-014 | `/auth` — role selection, email-link, phone OTP, Google | VIEW-02 `/auth` | NOT_STARTED | Member 2 | FE-001, BE-001 | Veyro Night |
| FE-015 | Provider linking, error/loading states | VIEW-02 `/auth` | NOT_STARTED | Member 2 | FE-014 | |
| FE-016 | `/onboarding/customer` — profile + optional vehicle | VIEW-03 | NOT_STARTED | Member 2 | FE-014, BE-005 | Studio Light |
| FE-017 | `/onboarding/driver` — 4-step flow with doc upload | VIEW-04 | NOT_STARTED | Member 4 | FE-014, BE-008 | Studio Light |

---

## M2 — Core Booking Flow

### Customer booking (PROMPT 03)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-018 | Booking studio — location, route, map | VIEW-05 `/customer` | NOT_STARTED | Member 2 | FE-001, BE-011 | |
| FE-019 | Vehicle pass, driver search/cards | VIEW-05 `/customer` | NOT_STARTED | Member 2 | FE-018 | |
| FE-020 | Quote/confirm flow, instant vs scheduled | VIEW-05 `/customer` | NOT_STARTED | Member 2 | FE-019, BE-012 | |
| FE-021 | Booking hub — upcoming, active, past | VIEW-08 `/customer/bookings` | NOT_STARTED | Member 2 | FE-020 | |
| FE-022 | Customer profile, vehicles, emergency contacts | VIEW-09 `/customer/profile` | NOT_STARTED | Member 2 | FE-016 | |

### Driver dashboard (PROMPT 05)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-023 | Driver application status page | VIEW-11 `/driver/status` | NOT_STARTED | Member 4 | FE-017 | |
| FE-024 | Online/offline toggle, GPS state, offer cards | VIEW-12 `/driver` | NOT_STARTED | Member 4 | FE-023, BE-010 | |
| FE-025 | Driver profile, rates, capabilities | VIEW-15 `/driver/profile` | NOT_STARTED | Member 4 | FE-023 | |

---

## M3 — Trip Lifecycle & Maps

### Customer trip (PROMPT 04)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-026 | Trip cockpit — all states | VIEW-06 `/customer/trips/[id]` | NOT_STARTED | Member 2 | FE-020, BE-016 | |
| FE-027 | Live location, stale GPS handling | VIEW-06 `/customer/trips/[id]` | NOT_STARTED | Member 3 | FE-026, BE-019 | |
| FE-028 | OTP display (start + end) | VIEW-06 `/customer/trips/[id]` | NOT_STARTED | Member 2 | FE-026 | |
| FE-029 | SOS action (demo mode wording) | VIEW-06 `/customer/trips/[id]` | NOT_STARTED | Member 2 | FE-026, BE-026 | |
| FE-030 | Trip sharing (create, revoke) | VIEW-10 `/share/[token]` | NOT_STARTED | Member 2 | FE-026, BE-020 | |
| FE-031 | Receipt, rating, report | VIEW-07 `/customer/trips/[id]/summary` | NOT_STARTED | Member 2 | FE-026, BE-021 | |

### Driver trip (PROMPT 05)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-032 | Driver trip cockpit — map, arrival, OTP numpads | VIEW-13 `/driver/trips/[id]` | NOT_STARTED | Member 4 | FE-024, BE-016 | |
| FE-033 | Driver earnings ledger | VIEW-14 `/driver/earnings` | NOT_STARTED | Member 4 | FE-032, BE-021 | |

### Maps integration

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-034 | Google Maps provider adapter | — | NOT_STARTED | Member 3 | FND-006 | |
| FE-035 | Places autocomplete, route preview, driver markers | VIEW-05 | NOT_STARTED | Member 3 | FE-034, FE-018 | |
| FE-036 | Active trip map with live location | VIEW-06, VIEW-13 | NOT_STARTED | Member 3 | FE-034, FE-027 | |

---

## M4 — Payments & Admin

### Payments

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-037 | Razorpay checkout integration | VIEW-07 | NOT_STARTED | Member 2 | FE-031, BE-021 | Test Mode only |
| FE-038 | Outstanding balance gate | VIEW-05 | NOT_STARTED | Member 2 | FE-037, BE-024 | |

### Admin (PROMPT 06)

| Task ID | Description | View/Route | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| FE-039 | Admin overview, KPI cards, application queue | VIEW-16 `/admin` | NOT_STARTED | Member 5 | FE-001, BE-030 | |
| FE-040 | Application review — document viewer, approve/reject | VIEW-17 `/admin/applications/[id]` | NOT_STARTED | Member 5 | FE-039, BE-030 | |
| FE-041 | Reports directory, resolution | VIEW-18 `/admin/reports` | NOT_STARTED | Member 5 | FE-039, BE-033 | |
| FE-042 | Driver/customer safety controls (suspend/restore) | VIEW-17 | NOT_STARTED | Member 5 | FE-040, BE-031 | |

---

## M5 — Testing & Hardening (PROMPT 08)

| Task ID | Description | Status | Owner | Notes |
|---|---|---|---|---|
| FE-043 | Accessibility audit (keyboard, focus, contrast, labels) | NOT_STARTED | Member 1 | WCAG 2.2 AA target |
| FE-044 | Responsive checks (320px–desktop) | NOT_STARTED | Member 1 | Mobile-first baseline |
| FE-045 | PWA manifest, service worker, install prompt | NOT_STARTED | Member 1 | Icons from asset pack |
| FE-046 | Performance (LCP ≤2.5s, JS budget ≤220KB gzipped) | NOT_STARTED | All | Measured on Android/4G |

