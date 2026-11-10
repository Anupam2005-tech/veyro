# Veyro Release 1 — Unified Product, UI/UX, Business Logic & Engineering Specification

**Version:** 3.6 — Google Cloud/Firebase-first infrastructure and passwordless authentication revision  
**Prepared:** 9 November 2026  
**Project type:** Five-person college project / capstone  
**Platform:** Responsive Progressive Web App (PWA)  
**Status:** Consolidated implementation baseline — product decisions DEC-01 through DEC-14 remain recorded; Google Cloud/Firebase-first infrastructure and passwordless authentication are the revised implementation baseline, synchronised with Backend Technical Specification v1.3 on 9 November 2026  

---

## 0. How to use this document

This document combines the product direction, the selected visual system, copy-ready UI prompts, technical architecture, business rules, safety requirements, feature roadmap, team responsibilities and engineering acceptance criteria.

### Decision labels

- **AGREED:** A project decision explicitly approved by the project owner/team.
- **BASELINE PROPOSAL:** A concrete recommendation in this document. It gives the team something implementable, but the project owner/team should approve it before treating it as a commercial rule.
- **OPEN — OWNER DECISION:** The product cannot be safely or honestly finalised without a decision. Use a configurable value for the college demo; do not invent a real-world policy.
- **DEFERRED:** Not part of Release 1. Do not add it simply because a UI prompt or generated component suggests it.


### Working rule

Use this file as the single source of truth. When a rule changes, update this file, the API contract, the database/state model, UI prompts and tests in the same pull request. Do not maintain competing versions of the same rule in separate documents.

---

# 1. Product definition

## 1.1 What Veyro is

Veyro connects a customer who owns a vehicle with an independent professional driver who provides the driving service.

**The customer provides the vehicle. The driver provides the driving service.**

Veyro is not a taxi fleet, car-rental service or driver-owned vehicle marketplace. All illustrations, maps, vehicle cards, booking forms and copy must reinforce that the vehicle belongs to the customer.

## 1.2 Release 1 outcomes

A customer must be able to:

1. Create an account and complete a customer profile.
2. Add a vehicle and select a compatible driver.
3. Create an instant or scheduled booking.
4. See the driver assignment and trip status.
5. Verify trip start and trip completion using separate one-time codes.
6. See the final fare and pay through Razorpay Test Mode.
7. View booking history and submit a report.

A driver must be able to:

1. Register, complete onboarding and upload documents.
2. Wait for manual Admin approval.
3. Go online only when approved and location permission is available.
4. Receive and accept/reject eligible offers.
5. Navigate to pickup, confirm arrival, verify start/end codes and complete the trip.
6. View a basic earnings ledger and submit a report.

An Admin must be able to:

1. Review driver applications manually and approve or reject them with a reason.
2. View submitted safety/service reports.
3. Deactivate or restore a driver with a mandatory audit reason.
4. See a minimal audit trail for sensitive Admin actions.

## 1.3 Existing product decisions to preserve

- Product name: **Veyro**.
- Customer-owned vehicle; driver supplies only the driving service.
- Customer vehicle categories: Hatchback, Sedan and SUV; Luxury may be represented as an additional capability if required by the design, but matching must use an explicitly agreed category set.
- Driver capabilities include vehicle category and transmission compatibility.
- Fuel type is informational; it is not a driver-vehicle compatibility rule.
- Both instant and scheduled bookings are supported.
- Scheduled bookings are allowed up to 30 days ahead.
- Instant driver offer response period: five minutes.
- Scheduled offers are broadcast to eligible drivers; first valid acceptance wins.
- If an assigned driver cancels, the customer manually creates a new request. Do not silently auto-reassign.
- Up to three intermediate stops may be added before booking confirmation.
- Destination and stops are locked after confirmation. Pickup can be changed before trip start if the driver is notified and the fare estimate is recalculated.
- Separate in-app trip-start and trip-end OTPs.
- Online payment only; no cash in Release 1.
- Payment is collected after trip completion.
- Fuel, tolls and parking are paid separately by the customer and are not included in the driver service charge.
- Up to three emergency contacts.
- Customer can create a revocable authenticated trip-share link; recipients must register or log in and present the valid share token before viewing the read-only location view.
- Reports use predefined categories and a written description; no image/video upload in Release 1.
- Reporter identity is visible to Admin but hidden from the reported party.
- Admin remains lightweight. No multi-role Admin permission matrix or per-admin overrides in Release 1.

---

# 2. Product UI/UX direction

## 2.1 The selected visual identity

The agreed direction is a deliberate two-context design system:

- **Veyro Night:** Public landing page and pre-authentication entry. Dark obsidian, silver glass and acid lime using a 60/30/10 art-direction balance.
- **Veyro Studio Light:** All authenticated customer, driver and Admin product screens. Cool alabaster, white surfaces, obsidian structure and restrained lime accents.

The internal application does **not** need a Night Demo Toggle in Release 1. Remove the toggle from the authenticated app shell. It adds a second visual mode to test and maintain without improving the core booking workflow.

## 2.2 Veyro Night — public landing and `/auth`

| Role | Token | Value | Use |
|---|---|---|---|
| Dark canvas (60%) | `--night-canvas` | `#030407` | Main background and hero canvas |
| Elevated surface | `--night-surface` | `#0B0E17` | Solid fallback for cards and modals |
| Silver glass (30%) | `--night-glass` | `rgba(170,176,196,0.08)` | Navbar, floating panels and glass cards |
| Active glass | `--night-glass-strong` | `rgba(170,176,196,0.14)` | Focused/selected panels |
| Silver structure | `--night-border` | `rgba(170,176,196,0.22)` | Borders and dividers |
| Primary text | `--night-text` | `#F2F4FA` | Headings and body text |
| Secondary silver | `--night-muted` | `#AAB0C4` | Metadata and secondary text |
| Acid lime (10%) | `--night-accent` | `#B8F23A` | Main CTA, key route line and selected highlights |
| Lime hover | `--night-accent-hover` | `#C9F762` | Hover/focus treatment only |
| Lime button ink | `--night-accent-ink` | `#030407` | Text/icon on lime buttons |
| Restrained extra accent | `--night-sassy` | `#FF2E93` | Very limited decorative badge only |

**60/30/10 means:** approximately 60% visual mass is dark, 30% is silver/glass/structural treatment and 10% is lime. It is an art-direction guide, not a literal pixel measurement. Silver must be visible as a real material layer, not only faint borders. Lime is for hierarchy and action, not every card. Do not use constant neon glow.

## 2.3 Veyro Studio Light — signed-in app

| Role | Token | Value | Use |
|---|---|---|---|
| Main canvas (light majority) | `--studio-bg` | `#F8F9FC` | Page background |
| Elevated surface | `--studio-surface` | `#FFFFFF` | Cards, forms, sheets and dialogs |
| Contrast feature surface | `--studio-obsidian` | `#090B10` | Vehicle Pass, OTP vault and selected feature cards |
| Primary ink | `--studio-ink` | `#090B10` | Headings and body text |
| Muted text | `--studio-muted` | `#525866` | Secondary text and metadata |
| Soft tint | `--studio-tint` | `#EEF2F8` | Chips and secondary controls |
| Structural border | `--studio-border` | `#E2E6F0` | Card edges and section dividers |
| Interactive border | `--studio-input-border` | `#71788A` | Input boundaries and visible control outlines |
| Lime action | `--studio-lime` | `#B8F23A` | Primary/high-priority action with dark text |
| Magenta accent | `--studio-sassy` | `#FF2E93` | Rare decorative badge; never small pink text on white |

The Studio Light balance is approximately 60% light surfaces, 30% obsidian/slate structure and 10% action accents. Do not carry the old warm-cream/orange/pink palette into the new internal application.

## 2.4 Theme boundary

- `/` — Veyro Night.
- `/auth` — Veyro Night.
- `/onboarding/customer` and `/onboarding/driver` — Veyro Studio Light after authentication.
- `/customer/*`, `/driver/*`, `/admin/*` — Veyro Studio Light.
- `/share/[token]` — authenticated read-only safety view with minimal branding; signed-out recipients are redirected to `/auth` with a return URL; no private dashboard chrome.

Theme selection is route/application-context driven. No in-app theme toggle in Release 1.

## 2.5 Typography and components

- **Display:** Syne 700/800 for landing hero, major headings and large fare numerals.
- **UI/body:** Inter 400/500/600 for forms, navigation, data, buttons and disclosures.
- **Monospace:** JetBrains Mono for OTP digits, booking IDs, countdowns and timestamps.
- **UI primitives:** shadcn/ui + Radix UI.
- **Styling:** Tailwind CSS.
- **Motion:** Motion for React for restrained spring transitions, drawers and sheet movement. Respect `prefers-reduced-motion`.
- **Icons:** Lucide React.
- **Signature components:** `VeyroButton`, `HolographicVehiclePass`, `DynamicTripPill`, `OtpVaultCard`, `StatusBadge`, `DriverOfferCard`, `MapBottomSheet`, `FareBreakdown`, `SafetyActionButton`.

Design defaults:
- 16–20px card radius; 48px minimum primary control height where practical.
- Mobile-first layout; one-thumb operation for driver actions.
- Use clear focus rings, explicit labels, helper/error text and disabled states.
- Never convey pending/approved/rejected/SOS/payment state using colour alone. Use icon + text + colour.
- Avoid heavy 3D effects in authenticated screens. Use a lightweight SVG/PNG vehicle sprite with a map marker fallback.
- Keep the landing page expressive; keep operational screens calm, readable and fast.

## 2.6 Accessibility requirements

Target WCAG 2.2 AA as the acceptance baseline:

- Normal text contrast at least 4.5:1; large text at least 3:1.
- Meaningful UI boundaries, focus indicators and graphical controls should reach at least 3:1 against adjacent colours where applicable.
- Lime buttons must use dark ink text (`#090B10`), not white.
- Do not use magenta as small text on white. Use dark text on a magenta badge or use magenta decoratively.
- All inputs need visible labels and errors; placeholders are not labels.
- Dialogs, bottom sheets, numpads and map controls must be keyboard-accessible.
- Provide accessible non-map location fields and status summaries; map is not the only way to set a location.
- Respect reduced motion and do not flash/pulse essential safety controls continuously.

---

# 3. Application screen architecture

Build reusable multi-state views rather than many independent static screens.

| ID | Route | View | Release 1 scope |
|---|---|---|---|
| VIEW-01 | `/` | Public Brand Landing | Hero, how-it-works, instant/scheduled comparison, safety/fare explanation, FAQ, legal footer |
| VIEW-02 | `/auth` | Authentication | Customer/Driver role selection; passwordless email-link, phone OTP and Google sign-in; provider linking and loading/error states |
| VIEW-03 | `/onboarding/customer` | Customer Onboarding | Name, phone contact, consent, optional vehicle setup |
| VIEW-04 | `/onboarding/driver` | Driver Onboarding | Profile/languages, capabilities/service areas, rates, document upload and submission |
| VIEW-05 | `/customer` | Booking Studio | Pickup/destination/stops, vehicle pass, route preview, driver search/cards, quote and confirmation |
| VIEW-06 | `/customer/trips/[id]` | Customer Trip Cockpit | Waiting for driver, assigned/en route, arrived/waiting, active trip, completion/payment |
| VIEW-07 | `/customer/trips/[id]/summary` | Receipt/Rating/Report | Itemised receipt, rating, favourite and report form |
| VIEW-08 | `/customer/bookings` | Booking Hub | Upcoming, active, past and favourites |
| VIEW-09 | `/customer/profile` | Customer Profile/Safety | Profile, vehicles, emergency contacts, notifications and privacy controls |
| VIEW-10 | `/share/[token]` | Authenticated Shared Trip View | Authenticated read-only trip status/map; signed-out redirect to `/auth` with return URL; stale-location notice and revoke/expiry state |
| VIEW-11 | `/driver/status` | Driver Application Status | Pending, needs changes, rejected, approved and deactivated |
| VIEW-12 | `/driver` | Driver Dashboard/Offers | Online/offline, GPS health, instant offers, scheduled offers and availability |
| VIEW-13 | `/driver/trips/[id]` | Driver Trip Cockpit | Navigation, arrival, wait timer, Start/End OTP, chat/call placeholder and completion |
| VIEW-14 | `/driver/earnings` | Driver Ledger | Completed trips, gross, fee/commission configuration and net earnings |
| VIEW-15 | `/driver/profile` | Driver Profile/Capabilities | Rates, categories, transmission, service areas, languages and document status |
| VIEW-16 | `/admin` | Admin Overview/Queue | KPIs and driver application queue |
| VIEW-17 | `/admin/applications/[id]` | Application Review | Secure document viewer, approve/reject and deactivation controls |
| VIEW-18 | `/admin/reports` | Reports/Safety Directory | Report list/detail, resolution note, driver lookup and audit actions |

### Prompt usage

Use the prompt IDs and instructions defined in Section 6. Each prompt must be treated as part of this specification; do not reference prompt IDs that are not listed there.

---

# 4. Recommended technical architecture

## 4.1 Architecture decision

**Updated infrastructure direction (approved 9 November 2026):** Veyro uses Firebase and Google Cloud as its Release 1 hosting and application platform. Deploy the Next.js PWA on Firebase App Hosting. Deploy the existing Express modular-monolith API as an HTTPS `onRequest` function on Firebase Cloud Functions (2nd gen), and keep scheduled/event-triggered handlers as separate Cloud Functions. Use Cloud Storage for Firebase for private images and driver verification documents. Firebase Authentication supports passwordless email-link, phone OTP and Google Sign-In. Firebase App Check uses reCAPTCHA Enterprise for the web app, with explicit App Check token verification on the custom Express API. Firebase Cloud Messaging (FCM) delivers web push notifications; configure the web push certificate/VAPID key and a messaging service worker. Google Maps Platform remains the maps provider (Maps JavaScript API, Places API (New), Routes API and Geocoding API as required by the implemented journeys). App Check enforcement is applied only to supported Maps services; all Maps API keys remain restricted by API and origin. Razorpay remains the payment provider.



The core stack direction is accepted. The following concrete service split is the recommended Release 1 baseline:

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | Next.js App Router + React + TypeScript | Customer, Driver, Admin and public app |
| UI | Tailwind CSS, shadcn/ui, Radix UI | Responsive accessible component system |
| Motion/icons | Motion for React, Lucide React | Transitions and icons |
| API | Node.js + Express.js + TypeScript | All business rules, validation, authorisation and integrations under the canonical API prefix `/api/v1/` |
| Identity | Firebase Authentication | Passwordless email-link sign-in, phone-number OTP and Google Sign-In; provider linking to one Firebase UID |
| Primary database | Cloud Firestore | Durable users, vehicles, applications, bookings, trips, payments, reports, notifications and audit logs |
| Live state | Firebase Realtime Database | Ephemeral driver presence and active-trip location updates only |
| File storage | Cloud Storage for Firebase | Private driver verification documents, profile images and approved uploads protected by Storage Security Rules |
| Maps | Google Maps Platform | Map rendering, Places autocomplete, geocoding and routes |
| Push notifications | Firebase Cloud Messaging (FCM) | Web push notifications for approved booking, trip and account events; in-app Firestore notification records remain authoritative |
| Performance | Firebase Performance Monitoring | Web performance traces and key loading/network metrics where supported |
| Product analytics | Google Analytics for Firebase | Consent-aware product events only; never send PII, trip locations or identity-document data |
| Payments | Razorpay Test Mode | Server-created orders, payment verification and test checkout |
| Background jobs | Firebase Cloud Functions | Scheduled and event-driven tasks; separate from the Express REST API |
| Frontend hosting | Firebase App Hosting | Next.js App Router PWA; GitHub-connected build/deploy and managed hosting |
| Backend hosting | Firebase Cloud Functions (2nd gen) | Express modular monolith deployed as an HTTPS `onRequest` function; separate scheduled/event-driven functions |

### Why this split

1. Keep one API and one place for domain logic: Express.
2. Keep Firestore as the durable source of truth. Do not store booking/payment lifecycle in both Firestore and Realtime Database.
3. Use Realtime Database only for high-frequency, short-lived presence/location signals. Do not add Socket.IO or a second custom WebSocket server in Release 1.
4. Host the Next.js frontend on Firebase App Hosting and the Express API as an HTTPS function on Firebase Cloud Functions (2nd gen); use separate Cloud Functions for scheduled/event-driven background work.
5. Keep Cloud Storage for Firebase as private object storage, not as a database.

**Avoid this architecture in Release 1:** Cloudflare services or third-party hosting outside Firebase, Socket.IO, custom WebSockets, Firebase listeners duplicating server-side state, or another database. Keep one Firebase/Google Cloud deployment ecosystem and one Express modular monolith.

## 4.2 Data ownership

- **Firestore owns durable truth:** booking status, accepted driver, fare snapshot, trip OTP state, payment status, reports and Admin audit records.
- **Realtime Database owns temporary live state:** current driver presence and the latest valid location sample for an active trip. It is not the source of truth for booking or payment state.
- **Cloud Storage for Firebase owns file bytes:** driver documents, profile images and other approved uploads. Firestore stores metadata and private storage paths, not public document URLs.
- **Firebase Auth owns identity authentication.** Firestore/backend owns product roles, application status and permissions. Do not trust role data sent from the browser.

## 4.3 Realtime GPS approach

- Driver app sends a location sample every 5–10 seconds while an active trip is in the foreground and permission is granted.
- Driver sends updates to an authenticated Express endpoint; Express verifies the Firebase ID token, confirms the driver is assigned to that active trip, validates the sample and writes the latest accepted sample to Realtime Database.
- Customer and authorised share view subscribe only to the relevant active trip location path through narrowly scoped rules or an authenticated server-mediated read.
- Firestore remains authoritative for whether the trip is active and who may see it.
- Do not persist a long raw GPS trail by default. Store current point and timestamp; define a retention policy before retaining historical traces.
- Do not build a second Socket.IO implementation in parallel.

## 4.4 Repository structure recommendation

```text
veyro/
  apps/
    web/                       # Next.js App Router frontend
    api/                       # Express + TypeScript backend
  functions/                  # Firebase Cloud Functions (scheduled/event-driven jobs)
  packages/
    ui/                        # shared UI components and design tokens
    contracts/                 # Shared TypeScript DTOs and API types; Express request validation uses express-validator
    config/                    # shared lint/tsconfig/tailwind configuration
  docs/
    Veyro_Release_1_Unified_Specification_v3.6_Google_Firebase.md
    api-contracts.md
    data-model.md
    test-plan.md
  infra/
    firebase/                  # Firestore, RTDB and Storage rules/index definitions
    firebase.json
    .firebaserc
    apphosting.yaml
    scripts/
  .github/workflows/           # CI checks
```

If a monorepo setup slows the team down, use two repositories (`veyro-web`, `veyro-api`) but keep `contracts` synchronised and versioned. Do not create separate repositories for each person or feature.

## 4.5 Environment and secrets

Keep secrets only in hosting environment variables / secret stores. Commit `.env.example` with names but no values.

Suggested variables:

```text
# Web / Firebase client configuration (public configuration, not server secrets)
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=

# Express API / Cloud Functions local development
PORT=
NODE_ENV=
FRONTEND_ORIGIN=
FIREBASE_PROJECT_ID=
FIREBASE_DATABASE_URL=
FIREBASE_STORAGE_BUCKET=

# Razorpay local development only; production values belong in Secret Manager
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Google Maps server-side key; production value belongs in Secret Manager
GOOGLE_MAPS_SERVER_KEY=
```

Never commit `.env`, service-account JSON files, private keys, Razorpay secrets, App Check debug tokens or unrestricted Google API keys. In production, use the Cloud Functions runtime service identity/Application Default Credentials for Firebase Admin access and Google Cloud Secret Manager for Razorpay and server-side Maps secrets. Firebase client config and browser Maps keys are public by design but must be restricted by origin and API scope.


## 4.6 Background execution — Firebase Cloud Functions

Firebase Cloud Functions (2nd gen) host both the Express HTTPS API and separate scheduled/event-driven background functions. The Express API remains one modular monolith; scheduled/event-driven handlers remain separate function entry points.

Use Cloud Functions for:
- Scheduled booking/offer expiry and scheduled-booking lifecycle checks.
- Event-triggered notification creation or delivery orchestration.
- Cleanup of expired temporary driver-presence and active-trip location records.
- Other bounded asynchronous tasks that should not block a client API request.

Keep normal client-facing REST endpoints and synchronous business operations in the Express app deployed through a Firebase Cloud Functions HTTPS `onRequest` function. Do not duplicate scheduled work using `node-cron` or a second queue. Use the Firebase Admin SDK in Functions with controlled configuration and least privilege. Design every scheduled task and event handler to be idempotent because triggers may retry; use stable event/task identifiers, transactions or conditional state changes to prevent duplicate effects. Test function handlers and retry/idempotency behaviour with the Firebase Emulator Suite or controlled test doubles.

Before deployment, verify the Firebase project plan and billing requirements for the selected Functions generation and scheduled functions, and set budget alerts/usage controls. Do not assume scheduled execution is cost-free.


## 4.7 Approved backend architecture decisions — implementation lock

The following 14 backend decisions are approved and must be applied consistently across the API, functions, deployment, tests and implementation prompts. The companion Backend Technical Specification v1.3 contains the detailed implementation design.

| # | Area | Approved Release 1 choice |
|---|---|---|
| 1 | Architecture style | Modular monolith: one Node.js + Express.js + TypeScript API with independent domain modules |
| 2 | Internal structure | Strict layered structure: routes, controllers, services, repositories, models/types and validators |
| 3 | API versioning | URL-based versioning; canonical prefix `/api/v1/` |
| 4 | Request validation | `express-validator`; no competing Zod request-validation layer |
| 5 | API documentation | OpenAPI specification and Swagger UI |
| 6 | Response format | Standard JSON envelope using `success`, `message`, `data` and `error`; pagination metadata only where needed |
| 7 | Error management | Custom application error classes and one central global Express error middleware |
| 8 | Logging | Basic `console.log`/`console.warn`/`console.error` captured by Google Cloud Logging; no Pino, Winston or third-party logging service in Release 1 |
| 9 | Environment configuration | `dotenv` locally, Firebase/Google Cloud runtime configuration and Secret Manager in production, central config module, startup validation and `.env.example`; use runtime service identity and never commit secrets |
| 10 | Firebase server integration | Initialise Firebase Admin SDK once and reuse it for Auth ID-token/App Check verification, Firestore, RTDB and Storage privileged operations |
| 11 | Authentication/authorisation | Verify Firebase ID tokens; backend role middleware for Customer/Driver/Admin plus resource-ownership checks; no custom JWT |
| 12 | Database/security rules | Restrictive Firestore, RTDB and Storage Security Rules plus App Check and backend validation/authorisation; Admin SDK bypasses Rules, so privileged server operations must enforce access explicitly |
| 13 | Firebase Cloud Functions runtime | Firebase Cloud Functions host the Express HTTPS API and separate scheduled/event-driven jobs; Express remains the single REST application |
| 14 | Testing | Essential automated tests with Jest/Supertest for critical service logic and HTTP/API/security/payment workflows, plus a documented manual end-to-end release checklist |

Do not substitute another database, request-validation framework, authentication system, realtime server, queue, scheduler or logging platform without a new explicit project decision.

---

# 5. Business logic — approved rules and remaining baselines

Rules explicitly approved in DEC-01 through DEC-14 are **AGREED** and are final for Release 1. Only timings, thresholds, retention durations, incident qualification details and other values not explicitly approved remain **BASELINE PROPOSALS** or **OPEN — OWNER DECISION**. Keep all configurable amounts and timing thresholds in server-side configuration, not scattered throughout React components.

## 5.1 Driver eligibility and matching

A driver is eligible for a booking only when all conditions are true:

1. Driver application status is `APPROVED`.
2. Driver is not deactivated or suspended.
3. Driver has explicitly set availability to `ONLINE`.
4. Driver has location permission and a sufficiently fresh location sample (suggested stale cutoff: 30 seconds).
5. Driver is not already assigned to an active trip or conflicting scheduled booking.
6. Driver service area includes the pickup area.
7. Driver supports the customer's vehicle category and transmission.
8. Driver meets any required minimum trip lead-time/availability constraint.

Fuel type is displayed but is not a matching filter.

**Approved search radius (DEC-08):** Start at 15 km. If no suitable drivers are found, show a clear empty state and let the customer explicitly expand the search radius. Do not silently expand the search. Expansion increments can be configurable; no fixed maximum radius has been approved.

**Sort options:** Recommended, closest, lowest estimated fare and highest rated. The initial Recommended order may use pickup distance first, then rating and estimated fare as tie-breakers. Show the ranking basis; do not describe the order as an objective quality score.

**Unavailable states:** No approved drivers, no online drivers, stale GPS, incompatible vehicle, all drivers busy, route lookup failed, and no driver accepted within the response window. Each needs a distinct explanation and retry action.

## 5.2 Instant booking

1. Customer enters pickup, destination and optional stops, selects a vehicle and sees a valid road route.
2. Backend finds eligible online drivers within the configured radius.
3. Customer compares the estimate and selects one driver.
4. Backend creates a booking offer with a five-minute expiry.
5. Driver accepts or rejects. Acceptance must be an atomic Firestore transaction: only the first valid acceptance can set the booking to `ASSIGNED`.
6. If driver rejects or the offer expires, tell the customer and return them to the available-driver list. No silent auto-reassignment.
7. If there are no remaining drivers, allow a new search or scheduled booking.

## 5.3 Scheduled booking — correct timing model

### Broadcast timing rationale

The broadcast window must be tied to the pickup time, not simply to the time the customer creates the booking. Otherwise, a booking made several days in advance could expire long before pickup.

### Recommended rule

- Booking window: at least 4 hours and at most 30 days before pickup.
- **Broadcast start:** `max(booking_created_at, pickup_at - 12 hours)`.
- **Broadcast end:** `pickup_at - 2 hours`.
- Drivers receive the scheduled offer only during that broadcast window.
- The first eligible driver acceptance wins using a server-side transaction.
- If the booking is made less than 12 hours before pickup but at least 4 hours before pickup, broadcast starts immediately and ends 2 hours before pickup.
- If no driver accepts by broadcast end, mark `NEEDS_REBOOK`, notify the customer and do not pretend a driver is assigned.

### Customer recovery screen

At `NEEDS_REBOOK`, show three explicit actions:

1. **Choose another pickup time** — select a new time at least four hours from the current time and no more than 30 days ahead.
2. **Try an instant driver now** — only if the customer is prepared to start now and instant drivers are available.
3. **Cancel request** — no cancellation fee because no driver was assigned.

Do not silently move the pickup time or auto-broadcast to a new time. If customer changes the schedule, create a new broadcast window using the new pickup time.

### State transitions

`SCHEDULED_DRAFT → SCHEDULED_QUEUED → SCHEDULED_BROADCASTING → ASSIGNED`

If no acceptance by `pickup_at - 2h`:

`SCHEDULED_BROADCASTING → NEEDS_REBOOK`

If customer cancels before assignment:

`SCHEDULED_QUEUED/BROADCASTING → CANCELLED_BY_CUSTOMER` (no fee).

## 5.4 Fare calculation — actual usage, no minimums

### Approved pricing model (DEC-01 to DEC-04)

Keep both `HOURLY` and `PER_KM` in the data model. Enable `HOURLY` in Release 1. Keep `PER_KM` disabled until GPS distance tracking passes the required tests and is explicitly activated. Every booking must store its selected `pricing_mode`; do not switch billing modes after the trip starts. Freeze the selected driver rate in the quote snapshot at confirmation.

**No minimums:** There is no minimum fare, no minimum billable duration and no minimum billing block. Charge only for actual usage.

**Estimate formula**

- `HOURLY`: `estimated_base_fare = hourly_rate × estimated_route_minutes / 60`.
- `PER_KM` (only after activation): `estimated_base_fare = per_km_rate × estimated_route_km`.
- Do not wrap either formula in `max(minimum_fare, ...)`.
- Round displayed INR values to the nearest rupee using one consistent server-side rounding function. Display that the amount is an estimate and explain what can change the final amount.

**Final formula**

- `HOURLY`: calculate elapsed minutes between successful Start OTP and successful End OTP; calculate a proportional charge using actual elapsed minutes. Do not round up to a minimum 15-minute block.
- `PER_KM`: after activation, calculate driven kilometres from valid, timestamped GPS samples collected during the active trip. Reject duplicate/out-of-order points, impossible jumps and samples with poor accuracy. Round accepted distance consistently, then apply the driver's frozen per-kilometre rate.
- If GPS quality is insufficient for a per-kilometre trip, set fare status to `REVIEW_REQUIRED`; do not silently bill a guessed distance.
- Add waiting fees only if the approved waiting rule below applies.
- Fuel, tolls and parking are excluded from Veyro's driver-service fare.
- Driver commission and customer platform fee are both zero in Release 1 (DEC-04).

### Quote snapshot must store

`pricing_mode`, selected driver rate, estimated distance, estimated duration, estimated base fare, waiting policy version, cancellation policy version, platform-fee/commission configuration version and quote timestamp. Do not store or apply a minimum fare.

### Driver-set rates

Drivers may set their own rates (DEC-03). Do not enforce Admin-configured minimum or maximum rate limits. Validate that rates are numeric, non-negative, within safe technical bounds and changed only through authorised driver profile flows.

## 5.5 Waiting, arrival and customer no-show

### Approved rule (DEC-06)

Use one consistent waiting timeline: 15 minutes free, a maximum of 30 minutes at the pickup point, and a customer no-show decision at the 30-minute mark.

- Driver taps **Arrived**. The backend verifies that the driver is assigned to the booking and that the most recent valid GPS location is within 100 metres of the pickup, with acceptable accuracy. GPS geofence alone must not trigger a charge.
- If GPS accuracy is poor, offer a fallback confirmation path (customer confirms arrival or Admin/support override in the demo). Record which path was used.
- The waiting clock starts at the backend-confirmed arrival timestamp.
- First 15 minutes: free.
- If the customer starts the trip after 15 minutes but before the 30-minute no-show threshold, apply one ₹50 waiting charge. Do not multiply or repeat the ₹50 charge by 15-minute intervals.
- At 30 minutes without a valid Start OTP, the driver can request **Customer No-Show**, subject to backend validation and an auditable record.
- A flat ₹150 customer no-show charge replaces the ₹50 waiting charge; never charge both for the same event.
- If the customer starts the trip within the first 15 minutes, no waiting fee applies.

### No-show fee record and dispute

1. A validated customer no-show creates a `NO_SHOW_FEE` ledger item for ₹150. The platform fee/commission remains zero; any driver allocation/settlement treatment must be represented transparently in the demo ledger and must not be described as a Veyro commission.
2. Customer receives a clear reason, timestamp and fee explanation.
3. Provide a way to report/dispute an incorrect no-show record; the dispute deadline and final settlement workflow remain implementation details to define.
4. Never treat a disputed amount as a confirmed payable balance while it is under review. Link the dispute to the relevant ledger item using `disputeStatus` and/or `linkedReportId`; the unpaid-balance gate must exclude entries whose dispute is actively under review.

## 5.6 Driver no-show and late arrival

ETA can change with traffic. Do not keep moving the contractual no-show deadline every time the map recalculates.

**Instant booking:** Save `promised_arrival_at` when the driver accepts. Show live ETA updates to the customer, but use the acceptance-time promise as the no-show baseline. If the driver is not confirmed arrived by 20 minutes after that baseline, mark the case as a qualifying driver no-show after an auditable verification.

**Scheduled booking:** Driver is expected at the scheduled pickup time. If not confirmed arrived by 20 minutes after scheduled pickup, mark the case as a qualifying driver no-show after an auditable verification.

**Approved accountability (DEC-05):**
- Track verified driver no-show incidents against the driver's account.
- On the fifth qualifying driver no-show, suspend the driver's account and remove the driver from online/offer eligibility. Record the incident and suspension in the audit trail.
- Do not impose an automatic monetary penalty on the driver under the approved decision.
- Customer cancellation caused by a verified driver no-show is ₹0.
- Notify the customer and let them create a new request. No silent auto-reassignment.
- The owner has not specified a rolling time window for the five incidents. Do not invent one; keep the counter durable until a policy update defines its reset/expiry rules.

## 5.7 Cancellation policy

### Scheduled booking customer cancellation (approved DEC-05)

| When customer cancels a scheduled booking | Customer charge |
|---|---:|
| Before driver acceptance | ₹0 |
| Within the first 5 minutes after driver acceptance | ₹0 |
| More than 5 minutes after driver acceptance, before driver arrival | ₹50 |
| After driver has arrived at the pickup location | ₹100 |

The 5-minute period is measured from the backend-recorded driver acceptance timestamp. If the driver has already arrived, the ₹100 arrived-stage charge applies rather than the ₹50 charge. The previously proposed scheduled cancellation slabs based on hours before pickup are superseded and must not be implemented.

### Instant booking and driver cancellation

Instant-booking customer cancellation charge is `₹0` in server configuration for Release 1. Do not copy the scheduled-booking ₹50/₹100 slabs to instant bookings without a later approved decision. A customer cancelling because of a verified driver no-show pays ₹0. Driver no-shows are tracked toward the fifth-incident suspension threshold; no driver no-show fee is approved.

### Cancellation reasons and incident tracking

- Provide reason dropdowns for both customers and drivers when cancelling a booking.
- Record selected reason, actor, booking, server timestamp and any optional supporting description.
- Track customer cancellation incidents. Suspend the customer account on the fifth qualifying cancellation.
- Track driver no-shows separately; suspend the driver on the fifth qualifying no-show. Do not conflate ordinary driver-initiated cancellations with verified no-shows.
- The rolling/reset period and exact qualifying-reason taxonomy have not been decided. Do not invent them; define them before production use.

All cancellation charges must be calculated on the backend from server timestamps and the policy version attached to the booking. Never calculate or collect a cancellation fee solely in the browser.

## 5.8 Outstanding payments and payment lifecycle

If a customer has a confirmed unpaid balance, block new bookings and show a sticky **Settle Previous Fare** action. Do not rely on a frontend-only check; the API must reject booking creation.

**Payment states:**

`CREATED → ORDER_CREATED → PENDING → CAPTURED`

Alternative outcomes: `FAILED`, `REFUND_PENDING`, `REFUNDED`, `DISPUTED`, `REVIEW_REQUIRED`.

Rules:
- Backend creates the Razorpay Order from the server-calculated payable amount.
- Never accept the amount from the browser as the source of truth.
- Client opens Razorpay Checkout using the server-created order.
- Client success callback is not enough to mark the payment paid.
- Verify Razorpay payment signature server-side.
- Verify payment/capture status through a trusted server-side API/webhook path.
- Verify webhook signatures using the original raw request body before parsing it.
- Store and deduplicate webhook event IDs; repeated or out-of-order notifications must not create duplicate payment credits.
- Use an idempotency key for Veyro's own `create payment attempt` action so double-clicks do not create duplicate active attempts.
- If checkout returns success but backend confirmation has not arrived, show `Payment verification pending`; do not show a false success.
- Retry after a failed attempt creates a new attempt linked to the same payable invoice. A captured payment must never be charged again.
- Refunds require an Admin-authorised action or controlled test refund process and an audit record.

For the college project use **Razorpay Test Mode only**. Do not switch to live keys for a college demo.

## 5.9 Driver earnings and platform revenue

Driver ledger should separate:

- Gross service fare.
- Waiting/no-show credit where applicable.
- Platform commission (if configured).
- Net driver earnings.
- Customer-paid fuel/tolls/parking shown as excluded, not included in Veyro earnings.

Formula:

`driver_net = eligible_driver_gross - platform_commission + approved_adjustments`

For Release 1, driver commission is `0%` and customer platform fee is `₹0` under DEC-04. Do not add either fee unless a later approved decision changes the revenue model.

Rate changes apply only to future quotes. Existing bookings use the rate snapshot accepted by the customer.

## 5.10 GPS, stale location and route handling

- Suggested foreground active-trip update cadence: every 5–10 seconds.
- Suggested stale threshold: 30 seconds without a valid sample.
- When stale: freeze the last known marker, display the exact `last updated` time and show an amber stale banner. Never animate a stale marker as if it is current.
- Request foreground location permission before a driver can go online and again when an active trip starts if needed.
- Validate timestamps, accuracy, coordinates and speed plausibility server-side.
- Discard duplicate or out-of-order samples.
- If location permission is revoked or the browser is backgrounded, show the correct limited-tracking state. A PWA cannot guarantee continuous background GPS after the browser/app is backgrounded or closed.
- Keep a manual **Open in Google Maps** fallback. Do not claim Veyro PWA navigation is equivalent to native turn-by-turn background navigation.
- If route calculation fails, block confirmation or show retry. Never use straight-line distance as the billable route fallback.
- Use a provider adapter around Google Maps so a later provider change does not require rewriting booking components.

## 5.11 Trip sharing

- Generate a cryptographically random, unguessable share token; store only a hash of the token on the backend.
- Anyone opening a shared ride link must register or log in before viewing location (DEC-10).
- The valid unguessable share token identifies the shared ride; a recipient who possesses the link must authenticate before viewing it. Authentication alone must never expose other shares, and no separate pre-approved recipient allowlist is required by this decision.
- No separate 8-digit access code is required under the approved Release 1 decision.
- Link expires automatically when the trip completes and can be revoked by the customer at any time before completion.
- Share view is read-only and exposes only necessary trip data: current status, driver first name/photo if consented, vehicle category marker, approximate route and last update time.
- Never expose the customer's account profile, full phone number, emergency contacts, payment information or driver documents.
- Use backend-mediated access or carefully scoped rules. Do not make the whole Realtime Database path public.

## 5.12 SOS and emergency contacts

The current documents say that a one-tap SOS alerts up to three emergency contacts, but the stack does not yet specify a delivery provider. A button alone does not deliver an alert.

**Release 1 safe implementation proposal:**

1. One tap immediately creates a server-side SOS event with trip ID, timestamp and last valid location. Do not show a confirmation modal before recording the event.
2. Send alerts through a real configured notification channel only when its delivery integration has been implemented and tested.
3. Show per-contact delivery state: `QUEUED`, `SENT`, `FAILED` or `UNKNOWN`.
4. Provide direct call actions to the saved contacts as a fallback.
5. A cancel/false-alarm action sends a follow-up notification and is audit-logged.
6. Never label an alert `SENT` just because the user tapped the SOS button.
7. Clearly state that Veyro SOS is not a substitute for local emergency services.

For Release 1, the approved implementation is **Demo SOS — no external message sent** (DEC-09). Use simulated contacts and show the recorded event in an Admin/demo console. Before real-world use, select and test an actual SMS/push provider, delivery receipts, retries and cost controls.

## 5.13 Reports and Admin resolution

Report form fields:
- Reporter role and trip ID (from authenticated session, not browser-submitted identity).
- Predefined reason category.
- Description (length-limited plain text; no file uploads in Release 1).
- Created timestamp and status.

Proposed statuses: `OPEN → UNDER_REVIEW → RESOLVED` or `DISMISSED`.

Admin can view identity and trip context. The reported party cannot see who submitted the report. Admin resolution requires a resolution note; only the reporter receives the resolution notification. Every Admin state change writes an audit record.

## 5.14 Driver application review

- All applications enter `PENDING_REVIEW`.
- Admin manually reviews the submitted profile and required documents.
- Admin may `APPROVE`, `REJECT` with mandatory reason, or `REQUEST_CHANGES` with a list of missing/incorrect items.
- A resubmitted application returns to `PENDING_REVIEW`.
- Pending, rejected, deactivated or needs-changes drivers cannot go online.
- No automated score threshold or AI approval/rejection in Release 1.

---

# 6. Copy-ready UI and implementation prompt book

**How to use these prompts:** Run Prompt 00 first. Then run each page prompt in a separate coding-agent task against the shared project. Give the agent this specification as its source of truth. Require it to inspect the repository and reuse existing components instead of creating duplicate design systems.

## PROMPT 00 — Design system, shared components and app foundation

```text
Act as a senior product designer and senior Next.js + TypeScript engineer. Build the Veyro Release 1 shared design system and reusable UI foundation.

PRODUCT MODEL
Veyro connects a customer who owns a vehicle with an independent professional driver. The customer supplies the car; the driver supplies the driving service. Veyro is not a taxi fleet or car-rental product.

STACK
- Next.js App Router, React and TypeScript
- Tailwind CSS
- shadcn/ui + Radix UI primitives
- Motion for React for restrained transitions
- Lucide React icons
- Inter for UI/body; Syne for display; JetBrains Mono for OTPs, countdowns and IDs

THEMES
1. Veyro Night is used only on `/` and `/auth`:
   - Canvas #030407; elevated surface #0B0E17
   - Silver text #AAB0C4; primary text #F2F4FA
   - Silver glass rgba(170,176,196,0.08) and active glass rgba(170,176,196,0.14)
   - Silver border rgba(170,176,196,0.22)
   - Acid lime #B8F23A with dark ink #030407; hover #C9F762
   - Hyper-magenta #FF2E93 only as a very rare decorative accent
   - Preserve the visual balance: 60% dark, 30% silver/glass, 10% lime.
2. Veyro Studio Light is used on all authenticated customer, driver and Admin routes:
   - Canvas #F8F9FC; surfaces #FFFFFF; soft tint #EEF2F8
   - Obsidian #090B10; muted text #525866; structural border #E2E6F0
   - Input border #71788A
   - Lime action #B8F23A with #090B10 text
   - Magenta #FF2E93 only for restrained badges with accessible dark text
Do not add an internal theme toggle. Switch theme by route/application context.

BUILD
- Design tokens as CSS variables and Tailwind theme extensions.
- Shared AppShell, public header, authenticated navigation, page containers and mobile bottom navigation.
- VeyroButton with primary lime, obsidian, secondary, destructive and loading variants.
- StatusBadge with icon + text + semantic colour.
- HolographicVehiclePass using an obsidian card and customer vehicle details.
- DynamicTripPill for current booking/trip state and countdown.
- OtpVaultCard with accessible display and masked input states.
- DriverOfferCard, FareBreakdown, EmptyState, ErrorState, LoadingState, ConfirmDialog and responsive MapBottomSheet.
- `/design-system` gallery demonstrating shared components in their intended themes.

QUALITY
- Mobile-first and keyboard accessible.
- Respect prefers-reduced-motion.
- No text-only placeholders for labels.
- Never use colour alone for status.
- Keep cards and controls readable at 320px width.
- Avoid heavy WebGL/Spline in authenticated routes.
- Do not implement backend business logic in components. Use typed API functions and mock data only where the API is not ready.

Before coding, inspect the repository, report the current structure, and modify existing files rather than duplicating them.
```

## PROMPT 01 — Public Veyro Night landing page

```text
Build the Veyro public landing page at `/` with Next.js, TypeScript, Tailwind CSS and Motion. Use the existing shared components and enforce Veyro Night.

ART DIRECTION
60% #030407 obsidian, 30% silver glass/detailing (#AAB0C4, translucent glass panels and silver hairlines), 10% #B8F23A acid lime. Use #F2F4FA for primary text. Keep magenta #FF2E93 rare. Do not make every card neon.

HERO
- Wordmark: VEYRO.
- Headline: “Your keys. Our pro. Zero traffic stress.”
- Supporting copy: “You own the ride. We bring the verified chauffeur — on demand or scheduled around your day.”
- Primary CTA: “Book Your Chauffeur” → `/auth?role=customer`.
- Secondary CTA: “Drive With Veyro” → `/auth?role=driver`.
- Use a refined animated SVG/Canvas route ribbon with a lime route line and restrained silver-glass telemetry cards. Provide a static fallback and reduced-motion support. Do not require Spline for the page to work.

SECTIONS
1. Sticky silver-glass header with VEYRO, links, install-app affordance and Sign In.
2. “Your Car. Your Keys. Our Chauffeur.” three-step explanation.
3. Instant vs Scheduled comparison. Instant has a five-minute selected-driver response period. Scheduled bookings can be 4 hours to 30 days ahead and are broadcast in the defined pre-pickup window; do not claim a driver is assigned before acceptance.
4. Customer-owned vehicle explainer and vehicle pass visual.
5. Transparent fare/safety section: show driver-service fare separately from fuel, tolls and parking. Explain the free waiting period and policies only using the currently approved values in the shared policy config.
6. Trip verification and emergency-safety section. Do not claim SOS messages are delivered unless a real delivery provider is configured; use the approved demo wording when in demo mode.
7. FAQ, legal links and footer.

Use responsive composition and real copy. Do not invent reviews, driver counts, service coverage or customer testimonials. Add metadata, accessible headings and PWA install affordance.
```

## PROMPT 02 — Authentication and customer/driver onboarding

```text
Build `/auth`, `/onboarding/customer` and `/onboarding/driver` using the Veyro shared design system.

AUTH
- Firebase Authentication supports three passwordless sign-in methods: email-link sign-in, phone-number SMS OTP and Google Sign-In. No password-based login or registration is offered.
- Email link: user enters an email address, receives a one-time sign-in link and completes sign-in through a dedicated callback/return route. Completing the link verifies the email; do not add a separate email-verification step.
- Phone: user enters a phone number in E.164 format, receives an SMS OTP through Firebase Phone Authentication and verifies the code. Add resend cooldown, abuse/rate controls, clear SMS-cost messaging where appropriate and test numbers for development.
- Google: use Firebase Google provider and handle popup/redirect flows and provider errors.
- Support linking email, phone and Google providers to one Firebase UID. Handle account-exists-with-different-credential and linking conflicts safely; prevent duplicate Veyro profiles for one person.
- Firebase's Email Link method requires enabling the Email/Password provider switch in the Firebase console as a prerequisite, but Veyro must not expose password credentials or password login UI.
- Do not implement Forgot Password, Reset Password or password-based registration/login.
- `/auth` uses Veyro Night. After successful authentication, onboarding uses Veyro Studio Light.

CUSTOMER ONBOARDING
Collect full name, contact phone, terms/privacy consent and optional first vehicle: make, model, category, transmission and fuel type. Let the customer finish without adding a vehicle if booking flow allows them to add it later.

DRIVER ONBOARDING — FOUR STEPS
1. Personal profile, phone contact, experience and spoken languages.
2. Vehicle categories/transmissions the driver can operate and service areas.
3. Hourly and per-kilometre rates may be collected and stored, but `PER_KM` remains disabled in Release 1. Only `HOURLY` is selectable/active in Release 1 UI until GPS distance tracking passes testing and activation is approved. Show a sample estimate with a clear demo/estimate label.
4. Driving licence, government ID and profile photo upload with file type/size validation and upload progress.

On submission, create `PENDING_REVIEW`. Pending drivers cannot go online. Show a status page for Pending, Needs Changes, Rejected, Approved and Deactivated. Rejection/request-changes must display the Admin reason and allow resubmission.

SECURITY
Use Cloud Storage for Firebase. Keep driver verification documents private. Permit only narrowly scoped authenticated uploads to the current user's storage path through Firebase Storage SDK and restrictive Storage Security Rules; privileged Admin review/download uses the backend. Never expose public document URLs. Validate file type, size, extension, ownership and upload state server-side.
```

## PROMPT 03 — Customer booking studio and map

```text
Build `/customer` as a map-first customer booking studio with a responsive desktop sidebar and draggable mobile bottom sheet. Use Veyro Studio Light.

LOCATION AND ROUTE
- Pickup A, destination B and up to three intermediate stops before confirmation.
- Google Places Autocomplete and draggable pins with reverse geocoding.
- Show a Google road route, distance and estimated duration before driver selection.
- Debounce route requests around 400ms after relevant place/pin changes.
- Do not recalculate route for simple pan/zoom.
- If route lookup fails, block confirmation and show retry. Never use straight-line distance as the bookable route.
- Keep Google Maps calls behind a provider adapter; use only permitted fields and obey current Google Maps terms.

VEHICLE PASS
Show the customer's make/model, category, transmission and fuel type. Matching uses category + transmission; fuel is informational only.

BOOKING TYPES
- Instant: eligible online driver markers plus comparison cards; selected driver gets a five-minute response window.
- Scheduled: enforce 4 hours minimum and 30 days maximum. Do not show unassigned live driver markers. Display eligible-driver count and the correct broadcast timeline: start at max(booking creation, pickup minus 12h), end at pickup minus 2h.

DRIVER SEARCH
Eligibility: approved, active, online, fresh GPS, no conflicting trip, service area match, vehicle category/transmission compatible. Start with a configurable 15km radius; allow user-requested expansion when no match is found. Filters: price, max pickup distance, rating, experience and language. Sorting: Recommended, Closest, Lowest estimated fare, Highest rated.

QUOTE/CONFIRM
Show `HOURLY` as the only selectable/active pricing mode in Release 1. `PER_KM` may remain in driver rate data and backend configuration, but must be disabled/hidden in the Release 1 booking UI until GPS distance tracking passes testing and activation is approved. Show the hourly driver rate, estimated route duration, estimated base fare, waiting/cancellation policy version and exclusions (fuel/tolls/parking). Freeze the quote snapshot on confirmation. Block booking if confirmed unpaid balance exists; allow a timely disputed amount to remain under review according to policy.

Do not make final fare calculations in React. Call the backend quote endpoint and display the server response.
```

## PROMPT 04 — Customer trip cockpit and protected sharing

```text
Build `/customer/trips/[id]`, `/customer/trips/[id]/summary` and `/share/[token]` using Veyro Studio Light.

CUSTOMER TRIP COCKPIT STATES
1. Awaiting driver: instant five-minute timer or scheduled broadcast status with exact start/end deadline.
2. Driver assigned/en route: live driver location, ETA, driver profile and last update timestamp.
3. Arrived/waiting: show backend-confirmed arrival time, free grace countdown, accrued wait fee and clear cancellation/no-show rules.
4. Active trip: route, current position, trip status, one-tap SOS action, trip-share control and separate trip-end OTP display when appropriate.
5. Completed/payment: itemised final fare, payment-pending/success/failure/refund states and receipt.

LIVE LOCATION
- Subscribe only to the active trip's authorised location path.
- If no valid GPS update for 30 seconds, freeze the marker and display “Last updated at [time]”. Do not simulate movement or call stale data live.
- Show a network/permission warning when tracking is interrupted.

OTP
- Start OTP is shown only to the customer after the driver has arrived.
- End OTP is separate and single-use.
- Do not put OTP digits in logs, analytics or URL parameters.

SOS
- One tap creates an SOS event immediately. Display per-contact delivery state. Do not show “Sent” unless a configured channel confirms delivery. In demo mode, explicitly say “Demo SOS — no external message sent”. Provide contact-call fallback.

TRIP SHARING
- Create a random unguessable link and store only a hash of its token server-side.
- Anyone opening the link must register or log in first. If signed out, redirect to `/auth` with the original share URL as a safe return URL. After authentication, verify the supplied token against its stored hash before returning the read-only share view.
- Authentication plus the valid share token is the complete access requirement.
- Link expires at trip completion and can be revoked by the customer.
- Share view is read-only and reveals only minimum trip information. Apply normal authentication and endpoint rate limits. Never expose the full customer/driver profile or payment information.

RECEIPT
Show estimate vs final, pricing mode, billable time/distance, waiting/no-show item, platform fee/commission only if configured, and excluded expenses. Customer report form uses predefined reasons and written description only.
```

## PROMPT 05 — Driver dashboard and trip cockpit

```text
Build `/driver/status`, `/driver`, `/driver/trips/[id]`, `/driver/earnings` and `/driver/profile` in Veyro Studio Light.

APPLICATION STATUS
Pending, Needs Changes, Rejected, Approved and Deactivated. Only approved and non-deactivated drivers may go online. Display Admin feedback and support resubmission.

DASHBOARD
- Online/Offline toggle with a server-side eligibility check.
- Show location permission and GPS freshness state.
- Instant request card includes customer-owned vehicle details, pickup/destination, mini route map, estimated duration/distance, pricing mode, estimated driver earnings and five-minute response timer.
- Scheduled offers show scheduled pickup, route, vehicle capabilities, proposed earnings and the correct broadcast expiry. First valid acceptance wins; losing drivers see “Already accepted”.
- Do not show a driver as online if GPS is stale or the driver has an active conflicting trip.

TRIP COCKPIT
- Google map, route line, next-turn banner if provider data supports it, ETA, re-centre and “Open in Google Maps” fallback.
- Driver must tap Arrived; backend verifies assignment and geofence/accuracy or a recorded fallback confirmation.
- Show the backend waiting clock and policy. At the configured no-show point, allow a customer-no-show request; backend applies the fee only after validation.
- Use accessible six-digit numpads for Start OTP and End OTP. Separate codes, expiry and attempt limits.
- Do not allow driver to go offline while an active trip is in progress.
- Explain foreground location limitations; do not promise background tracking from a browser PWA.

EARNINGS/PROFILE
Show rate configuration, completed trips, gross service amount, commission/configured deductions, adjustments and net. Mark demo earnings clearly. Rate changes affect future bookings only.
```

## PROMPT 06 — Lightweight Admin, manual review and safety

```text
Build `/admin`, `/admin/applications/[id]` and `/admin/reports` in Veyro Studio Light.

ACCESS
- One `ADMIN` role for Release 1. No multi-role permission editor, per-admin overrides, ban/appeal portal or automatic driver scoring.
- Protect every Admin route and endpoint on the backend. Hiding a button is not authorisation.

OVERVIEW
KPI cards: Pending Applications, Approved Drivers, Rejected Applications and Open Reports. Search/filter application queue.

APPLICATION REVIEW
Show driver details and private document viewer. Download/view URLs must be short-lived presigned URLs. Admin can Approve, Reject with mandatory reason, or Request Changes with a list of missing/incorrect items. Every action records Admin ID, timestamp, old state, new state and reason.

DRIVER AND CUSTOMER SAFETY
- Add Deactivate/Suspend Driver with mandatory reason and Restore Driver with mandatory audit note. A suspended driver immediately loses online/offer eligibility. Automatically suspend the driver when the fifth verified no-show incident is recorded, as required by DEC-05. Admin can inspect the incident history; restoration must be explicitly authorised and audit-logged.
- Add a customer status/detail view that shows cancellation incident history and suspension reason. Automatically suspend a customer on the fifth qualifying cancellation. Provide an Admin restore action backed by `POST /api/v1/admin/customers/:id/restore`; require a mandatory audit note/reason and log the old/new status.
- Admin must be able to inspect both driver no-show and customer cancellation histories. Do not invent a rolling reset window or count ordinary driver cancellations as no-shows.

REPORTS
Show report ID, trip ID, reporter role, category, timestamp and status. Admin can open the detail, set Under Review, Resolve with a required resolution note or Dismiss with a reason. Notify only the reporter. The reported party cannot see reporter identity.

AUDIT
Log every approval, rejection, request-changes, deactivation, restoration, report resolution and refund-related action. Admin screens need loading, empty, error and confirmation states.
```

## PROMPT 07 — Backend business rules and API contracts

```text
Act as the backend lead. Implement Veyro domain logic in Node.js + Express + TypeScript. All authoritative rules live in the API; never trust browser calculations or status changes.

Initialise Firebase Admin SDK once in a central configuration module and reuse it for Firebase ID token verification, Firestore and RTDB access. Use Firestore as the durable source of truth and Realtime Database only for ephemeral presence/current GPS. Use express-validator chains for route parameters, query strings and request bodies; keep validation rules organised by module. Do not use Zod as a competing Express request-validation layer. Enforce restrictive Firestore and RTDB Security Rules for client access; remember that Admin SDK bypasses those rules, so Express must perform server-side role, ownership and resource authorisation before privileged operations. Use Firebase ID token verification plus backend role middleware for Customer, Driver and Admin, with resource-ownership checks; do not introduce custom JWT authentication. Use Firestore transactions for race-sensitive booking acceptance, OTP consumption, balance updates and payment state changes. Implement scheduled and event-driven background tasks in Firebase Cloud Functions; keep ordinary client-facing REST requests in Express. Return the standard JSON response envelope (`success`, `message`, `data`, `error`) and route unexpected failures through central global Express error middleware with custom application errors. Use basic console logging captured by Google Cloud Logging and Cloud Monitoring for metrics/alerts; do not add Pino/Winston or a third-party logging platform in Release 1.

Implement modules for auth/authorization, customers/vehicles, drivers/applications/availability, quotes, bookings, trips, payments, reports, share links, SOS and Admin audit.

Required behavior:
- Enforce driver eligibility server-side.
- Instant offer expires after five minutes.
- Scheduled broadcast starts at max(createdAt, pickupAt - 12h) and ends at pickupAt - 2h.
- First eligible scheduled acceptance wins atomically.
- Store a quote snapshot at confirmation.
- Validate pickup geofence and location accuracy before arrival is accepted.
- Generate separate cryptographically random Start and End OTPs; store only hashes; expire them; limit attempts; consume once.
- Calculate `HOURLY` fare and waiting/no-show/cancellation items using the policy version stored with the booking. Keep `PER_KM` in the schema/config but reject or hide it for Release 1 bookings until GPS distance tracking passes tests and the mode is explicitly activated.
- Apply DEC-05 accountability server-side: count verified driver no-shows and customer cancellations independently; automatically suspend the driver on the fifth verified no-show and the customer on the fifth qualifying cancellation. Persist the counters/incident history and write an Admin audit event. Do not invent a rolling reset window.
- Provide cancellation-reason dropdown values for both customers and drivers; persist actor, selected reason, booking and server timestamp.
- Default instant-booking customer cancellation charges to `₹0` in server configuration. Do not copy scheduled-booking ₹50/₹100 slabs to instant bookings without a later approved decision. For scheduled bookings, charge ₹0 before acceptance and within the first five minutes after acceptance, ₹50 after five minutes but before arrival, and ₹100 after driver arrival.
- Create Razorpay orders server-side; verify payment signatures and webhook signatures; deduplicate webhook events; prevent duplicate capture/credits.
- Block booking creation when confirmed unpaid balance exists, except an amount under an active dispute is not yet a confirmed due amount.
- Enforce report privacy and Admin audit logging.
- Do not silently reassign a driver after cancellation/no-show.

Use consistent plural resource paths under `/api/v1`. Maintain an OpenAPI specification and Swagger UI, stable error codes, integration tests and seed scripts. Never return public or permanent driver-document URLs; store Firebase Storage paths and metadata, and serve sensitive documents only through authorised access.
```

## PROMPT 08 — Test plan, accessibility and release readiness

```text
Act as Veyro's QA and release engineer. Do not add new product features. Test the implementation against the unified specification.

Use the approved essential automated testing strategy: Jest for unit/service tests and Supertest for HTTP integration tests. Prioritise critical business rules, authentication/authorisation, race-sensitive workflows and payments; do not build a large automated browser E2E suite for Release 1.

Create:
- Unit/service tests for driver eligibility, fare calculations, waiting/cancellation/no-show rules, OTP expiry/attempt limits, payment state transitions and idempotent Cloud Function handlers.
- HTTP integration tests for Firebase auth middleware, role/resource ownership checks, express-validator responses, Firestore transactions, scheduled broadcast expiry, first-acceptance-wins, Firebase Storage owner-rule and Admin-access authorisation and Razorpay signature/webhook verification.
- Automated security/integration tests for cross-user booking access, driver access to another driver's application, customer access to another trip, public RTDB access, share-token guessing, report identity leakage, Admin endpoint access and duplicate payment callbacks.
- A documented manual end-to-end release checklist covering customer signup, driver onboarding/manual approval, instant and scheduled booking, trip start/end, failed payment/retry, outstanding balance, report submission and Admin resolution.
- Manual accessibility checks for keyboard navigation, focus visibility, form labels/errors, contrast, screen-reader names and reduced-motion.
- Manual responsive checks at 320px, 360px, 390px, tablet and desktop widths.

Test at least one mid-range Android phone on mobile data. Capture real LCP, route bundle size, map load behavior, GPS freshness and PWA permission states. Do not claim a performance target passed based only on a desktop emulator.

Every test must use seeded demo users/data. No real customer identity documents or live payments in the college demo.
```

---

# 7. Feature delivery roadmap

Prioritise a complete working service journey over a large number of impressive static screens.

## 7.1 Essential — Release 1 MVP

**Build these first.** The project is not functionally complete until the customer-to-driver trip and payment loop works end to end.

1. Shared design system, route-based themes and responsive PWA shell.
2. Customer/Driver authentication: passwordless email link, phone OTP and Google sign-in, loading/error states.
3. Customer onboarding, vehicle create/edit and profile.
4. Driver onboarding, private document upload and application status.
5. Lightweight Admin manual driver review, approve/reject/request changes and audit log.
6. Driver online/offline availability and server-side eligibility.
7. Customer pickup/destination entry, route preview and driver search.
8. Instant booking with five-minute offer, explicit acceptance and no silent reassignment.
9. Scheduled booking with corrected broadcast timing and `NEEDS_REBOOK` recovery.
10. Booking/trip state machine, driver-arrived confirmation and separate Start/End OTP verification.
11. Basic active-trip location sharing with stale GPS handling. No promise of continuous background tracking.
12. Basic authenticated trip sharing: recipient registration/login plus valid share token, authenticated read-only location view, signed-out redirect to `/auth` with return URL, expiry and customer revocation.
13. Server-side fare quote/final calculation with a frozen booking snapshot and clear exclusions.
14. Razorpay Test Mode order creation, server signature verification, pending/failure/success/retry/duplicate handling.
15. Outstanding-balance gate and payment receipt.
16. Basic customer/driver trip history and driver earnings ledger.
17. Report submission, Admin report view and minimal resolution note.
18. Admin driver and customer suspension/restore controls, including fifth-incident automation and audit trail.
19. Essential privacy/security controls, error states, tests and deployment.

## 7.2 Advanced — Release 1.1 / after MVP works

1. 2.5D vehicle sprite with smooth heading rotation.
2. More refined Google vector map tilt/heading and in-app turn banner.
3. Advanced filters, driver comparison and favourites.
4. Emergency contact/SOS delivery integration with real provider, delivery receipts and fallback handling.
5. In-app customer/driver chat and masked calling integration.
6. Push notification reliability and offline/reconnection improvements.
7. Expanded report investigation notes and review workflow.
8. Better earnings charts and configurable platform fee/commission, once approved.
9. Real-device performance tuning and map quota optimisation.
10. Optional three-stop route UX polish and trip modification refinements.

## 7.3 Future releases — explicitly defer

1. Native Android/iOS apps and reliable native background GPS.
2. Voice-guided navigation and advanced turn-by-turn routing.
3. Full 3D vehicle models, 3D city/building scenes and heavy WebGL experiences.
4. Automated AI driver scoring or auto-approval.
5. Five-role Admin RBAC, permission overrides and complex appeals/ban workflows.
6. Automated driver payouts, tax/compliance and production settlement reconciliation.
7. Advanced analytics, forecasting and dynamic pricing.
8. Multi-provider maps abstraction with production-tested fallback providers.
9. Full customer support/helpdesk, insurance integrations and enterprise controls.

**Do not start Advanced or Future items while an Essential feature has no working backend, error state and test.**

---

# 8. Security, privacy and safety checklist

## 8.1 Authentication and authorisation

- Verify Firebase ID tokens in Express for every protected API request.
- Enforce roles and resource ownership on the backend. Do not trust `role`, `userId`, `driverId` or `customerId` values from the browser.
- A customer can only view their own vehicles/bookings/trips/payments/reports.
- A driver can only view offers assigned to/available to them and trips assigned to them.
- Only Admin can review applications, read report identities, deactivate drivers or resolve reports.
- Use deny-by-default Firestore, Realtime Database and Cloud Storage Security Rules. Test all rules in the Firebase Emulator Suite before deployment.
- Protect Admin bootstrap/creation. Do not let users self-assign `ADMIN`.

## 8.1.1 Firebase App Check

Register the web app with Firebase App Check and use reCAPTCHA Enterprise as the web provider. Initialise App Check before protected Firebase SDK calls. Monitor metrics before enabling enforcement for Firestore, RTDB, Cloud Storage, Maps JavaScript API and Places API (New) where supported. Firebase Authentication App Check is currently documented as Preview; verify availability and limitations before relying on enforcement.

For the custom Express HTTPS API, the web client must obtain a limited-use App Check token and send it in `X-Firebase-AppCheck`. Express middleware must verify it with Firebase Admin SDK `getAppCheck().verifyToken(token, { consume: true })` and reject missing, invalid or already-consumed tokens. Grant the Cloud Functions runtime service account the required Firebase App Check token-verifier permission for token consumption. Do not assume HTTP `onRequest` functions receive automatic App Check enforcement; automatic Cloud Functions enforcement applies to callable functions. Use debug provider tokens only in local development/CI, never production.

App Check supplements authentication, role/ownership checks, validation and rate limiting; it does not replace them.

## 8.2 OTP and booking protection

- Generate six-digit trip codes using a cryptographically secure random generator.
- Store only the share-token hash; expire and revoke tokens; require a Firebase-authenticated session and the valid share token before returning the share view. Do not add an access code or separate recipient authorisation/allowlist.
- Start and End OTPs must be different, single-use and bound to one trip.
- Never place OTPs in URL query strings, logs or analytics.
- Use server timestamps for offer expiry, scheduled expiry, waiting and cancellation calculations.
- Use Firestore transactions for first-acceptance-wins and state changes. Reject stale clients attempting to overwrite a newer state.

## 8.3 Private driver documents

- Firebase Storage paths for driver verification documents must remain private. Profile-image paths must also be scoped to the owning UID and use explicit content-type/size limits.
- Browser uploads use Firebase Storage SDK only for the authenticated user's permitted path, with deny-by-default Storage Security Rules and server-side post-upload validation.
- Admin document reads must be authorised by the backend/Admin SDK; do not expose permanent public download URLs.
- Validate file size, file type, extension and ownership server-side. Do not trust the browser MIME type alone.
- Use random object keys; do not use phone number, licence number or other PII in object names.
- Never expose storage credentials or permanent public driver-document links.
- Use synthetic or redacted documents for the college demonstration.

## 8.4 Live location and map privacy

- Location collection is active-trip only, with clear permission and purpose copy.
- Driver can see when location is being shared.
- Customer sees location only for their assigned active trip.
- A share-link viewer must be signed in and present the valid share token; the view is read-only and exposes only minimum information while the token is active.
- Stop live sharing after trip completion, cancellation or revocation.
- Validate timestamps, accuracy and impossible jumps; display stale state.
- Retain live location only during an active ride. Completed ride history and driver verification documents follow separate retention periods; define exact durations and deletion jobs before collecting real user data.
- Google Maps content must be stored/cached only as permitted by the current Google Maps Platform terms. Place IDs and temporary coordinate caching have specific rules; do not assume route polylines, map tiles or all route content can be retained indefinitely.

## 8.5 Share-link security

- Use a cryptographically random unguessable token; store only the hash.
- Require an authenticated session plus the valid, unguessable share token. Apply normal login and endpoint rate limits; do not require an access code or recipient allowlist.
- Expire at trip completion and support immediate revocation.
- Do not expose account details, contact numbers, emergency contacts, payment data or documents.
- Avoid logging raw share tokens or authentication credentials.

## 8.6 Payments

- Razorpay secret stays on the server.
- Create an Order on the server for each payment attempt.
- Calculate amount on the server; never trust amount/currency from the browser.
- Verify payment signature on the server.
- Verify webhooks using the original raw body and webhook secret.
- Deduplicate webhook event IDs and make payment transitions idempotent.
- Do not equate a client-side success callback with a captured payment.
- Keep test keys and live keys separate; college project uses Test Mode only.

## 8.7 SOS and incident safety

- SOS action must create a durable event immediately, with trip, timestamp and last known location.
- Show real delivery status; do not display `SENT` for an unconfigured or failed channel.
- Provide direct call fallback and clear local emergency-services disclaimer.
- Record cancel/false-alarm action without deleting the initial event.
- Test SOS on real devices and with consenting test contacts before any public pilot.

## 8.8 Web application security

- HTTPS only.
- Use secure headers (for example Helmet), allowlisted CORS and rate limiting.
- Validate all API input with shared schemas; encode/output-escape user text.
- Add request size limits and upload limits.
- Protect sensitive mutations against CSRF where cookie-based sessions are used; if using bearer tokens, still validate origin and permissions appropriately.
- Do not cache private API responses or driver documents in the PWA service worker.
- Keep dependencies patched and run dependency/security scans.
- Redact tokens, OTPs, phone numbers and payment secrets from logs.

## 8.9 College demo data policy

Use fictional names, generated phone numbers, sample locations and dummy licences/IDs. Use Razorpay Test Mode. Do not collect classmates' real identity documents or publish live location links. Before a real public launch, conduct a separate privacy, data-retention, consent, regulatory and operational safety review.

---

# 9. Data model and core collections

This is a starter model, not a substitute for reviewing exact Firestore indexes and security rules.

| Collection | Purpose | Important fields |
|---|---|---|
| `users` | Common identity/profile | `uid`, `role`, `name`, `phone`, `email`, `createdAt`, `status`, `customerCancellationCount`, `verifiedNoShowCount`, `suspensionReason`, `suspendedAt`, `unpaidBalance` |
| `vehicles` | Customer-owned vehicles | `id`, `customerId`, `make`, `model`, `category`, `transmission`, `fuelType`, `isDefault` |
| `driverApplications` | Driver application/review | `driverId`, `status`, `profile`, `capabilities`, `serviceAreas`, `rates`, `documents[]`, `reviewReason`, `reviewedBy`, `reviewedAt` |
| `drivers` | Approved driver operating profile | `driverId`, `approvalStatus`, `isSuspended`, `isOnline`, `capabilities`, `serviceAreas`, `rates` (including stored `HOURLY` and `PER_KM`; `PER_KM` disabled for Release 1), `verifiedNoShowCount`, `suspensionReason`, `suspendedAt` |
| `bookings` | Booking request and assignment | `customerId`, `driverId`, `vehicleSnapshot`, `pickup`, `destination`, `stops[]`, `bookingType`, `pickupAt`, `status`, `broadcastStartAt`, `broadcastEndAt`, `quoteSnapshot`, `policyVersion` |
| `trips` | Operational trip | `bookingId`, `customerId`, `driverId`, `status`, `arrivedAt`, `startedAt`, `endedAt`, `startOtpHash`, `endOtpHash`, `locationQuality`, `fareFinal` |
| `payments` | Payment attempts and payment receipt data | `tripId`, `customerId`, `amount`, `currency`, `razorpayOrderId`, `razorpayPaymentId`, `status`, `attemptId`, `verifiedAt` |
| `ledgerEntries` | Customer balance and driver earnings | `ownerId`, `tripId`, `type`, `amount`, `status`, `reason`, `disputeStatus`, `linkedReportId`, `createdAt` |
| `reports` | Customer/driver reports | `tripId`, `reporterId`, `reportedUserId`, `category`, `description`, `status`, `resolutionNote`, `resolvedBy`, `resolvedAt` |
| `notifications` | In-app notifications | `userId`, `type`, `title`, `body`, `readAt`, `createdAt` |
| `adminAuditLogs` | Sensitive Admin actions | `adminId`, `action`, `entityType`, `entityId`, `before`, `after`, `reason`, `createdAt` |
| `shareLinks` | Trip share credentials | `tripId`, `tokenHash`, `expiresAt`, `revokedAt`, `createdBy`; require only a valid share token plus an authenticated session at read time; no access code or recipient allowlist |
| `sosEvents` | Emergency event/audit | `tripId`, `customerId`, `status`, `locationSnapshot`, `createdAt`, `cancelledAt`, `deliveryAttempts[]` |

Realtime Database paths are intentionally limited:

```text
/driverPresence/{driverId}
  status, lastSeenAt, locationPermissionState

/tripLocations/{tripId}
  lat, lng, heading, accuracy, capturedAt, receivedAt

/tripAccess/{tripId}/{uid}
  read: true/false   # maintained by trusted backend only
```

Do not duplicate the full Firestore booking or payment document in Realtime Database. Clear active location nodes when trips end or are revoked, subject to any explicitly approved incident-retention policy.

---

# 10. API contract outline

All endpoints are under `/api/v1`. Route paths in the table below are relative to that shared prefix. The API is the authority for business rules.

| Endpoint | Method | Purpose |
|---|---|---|
| `/auth/session` | POST | Verify Firebase token / create or sync product profile |
| `/me` | GET/PATCH | Current user's profile and access flags |
| `/customers/vehicles` | GET/POST | List/create customer vehicles |
| `/customers/vehicles/:id` | PATCH/DELETE | Update/remove own vehicle |
| `/drivers/application` | GET/POST/PATCH | Create/read/resubmit driver application |
| `/drivers/documents/complete-upload` | POST | Verify a Firebase Storage upload path, metadata, ownership and file constraints; record the private document reference |
| `/drivers/availability` | PATCH | Go online/offline with eligibility validation |
| `/drivers/offers` | GET | List offers for authenticated driver |
| `/drivers/offers/:id/accept` | POST | Accept offer atomically |
| `/drivers/offers/:id/reject` | POST | Reject offer |
| `/bookings/quote` | POST | Compute eligibility and fare estimate |
| `/bookings` | POST/GET | Create booking/list customer's bookings |
| `/bookings/:id/cancel` | POST | Cancel with backend policy calculation |
| `/bookings/:id` | GET | Read authorised booking state |
| `/trips/:id/arrive` | POST | Confirm arrival and start wait timer |
| `/trips/:id/start-otp/verify` | POST | Verify and consume Start OTP |
| `/trips/:id/end-otp/verify` | POST | Verify and consume End OTP |
| `/trips/:id/location` | POST | Validate and publish current driver location to RTDB |
| `/trips/:id/share-links` | POST | Create protected share link |
| `/share/:token` | GET | Return the read-only share view only after Firebase authentication and valid token-hash verification; otherwise redirect signed-out users to `/auth` with a return URL |
| `/trips/:id/share-links/:shareId` | DELETE | Revoke share link |
| `/trips/:id/sos` | POST | Create SOS event and dispatch configured notification adapter |
| `/payments/orders` | POST | Create server-calculated Razorpay Order |
| `/payments/verify` | POST | Verify checkout signature/status |
| `/payments/webhook` | POST | Verify raw-body webhook and process idempotently |
| `/reports` | POST/GET | Submit own report / list own reports |
| `/admin/applications` | GET | Admin queue |
| `/admin/applications/:id/review` | POST | Approve/reject/request changes |
| `/admin/drivers/:id/deactivate` | POST | Deactivate with mandatory reason |
| `/admin/drivers/:id/restore` | POST | Restore with mandatory audit note |
| `/admin/customers/:id` | GET | Admin view of customer status and cancellation incident history |
| `/admin/customers/:id/restore` | POST | Restore a suspended customer with mandatory audit note and reason |
| `/admin/reports` | GET | Admin report queue |
| `/admin/reports/:id/resolve` | POST | Resolve/dismiss with note |

### Common response contract

Use a consistent response shape across all endpoints:
- `success: true` on success; `success: false` on failure.
- `message` is a top-level human-readable string in both success and error responses.
- `data` contains the response payload on success; omitted on error.
- `error` contains `{ code, details }` on failure; omitted on success. `details` is an array of structured error details, consistent with express-validator.
- `meta` is always present on every response and must include `requestId` for request tracing. Optional pagination metadata (`page`, `limit`, `total`, `totalPages`) is included in `meta` only when relevant.

Success response:

```json
{
  "success": true,
  "message": "Booking retrieved successfully.",
  "data": {
    "id": "booking_id",
    "status": "CONFIRMED"
  },
  "meta": {
    "requestId": "req_01HJXZ89ABCDEF0123456789"
  }
}
```

Error response:

```json
{
  "success": false,
  "message": "No eligible drivers are available for this request.",
  "error": {
    "code": "BOOKING_NOT_ELIGIBLE",
    "details": []
  },
  "meta": {
    "requestId": "req_01HJXZ89ABCDEF0123456789"
  }
}
```

Use appropriate HTTP status codes: `400` validation, `401` unauthenticated, `403` not authorised, `404` not found, `409` state conflict, `422` business-rule failure, `429` rate limited, `500` unexpected failure. Do not leak internal stack traces to the browser.

---

# 11. State machines — minimum required statuses

## 11.1 Driver application

`DRAFT → PENDING_REVIEW → APPROVED`

Alternative paths: `PENDING_REVIEW → NEEDS_CHANGES → PENDING_REVIEW`; `PENDING_REVIEW → REJECTED`; `APPROVED → DEACTIVATED → APPROVED` after Admin restoration.

Only `APPROVED`, not suspended, and otherwise eligible drivers may go online.

## 11.2 Customer account status

Customer account status includes `ACTIVE` and `SUSPENDED`. On the fifth qualifying customer cancellation, set the account to `SUSPENDED` automatically and block new booking creation. Admin may restore the account through `POST /api/v1/admin/customers/:id/restore` with a mandatory reason/audit note. Preserve the incident history and audit both suspension and restoration. Do not invent a rolling reset window.

## 11.3 Booking

Suggested statuses:

- `DRAFT`
- `SEARCHING` (instant)
- `SCHEDULED_QUEUED`
- `SCHEDULED_BROADCASTING`
- `ASSIGNED`
- `NEEDS_REBOOK`
- `CANCELLED_BY_CUSTOMER`
- `CANCELLED_BY_DRIVER`
- `EXPIRED`
- `CUSTOMER_NO_SHOW`
- `DRIVER_NO_SHOW`

Once accepted, store exactly one `driverId`. State changes must be validated against the current state, not just written by the client.

## 11.4 Trip

`NOT_STARTED → DRIVER_EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED`

Alternative terminal/review states: `CANCELLED`, `CUSTOMER_NO_SHOW`, `DRIVER_NO_SHOW`, `REVIEW_REQUIRED`.

## 11.5 Payment

`CREATED → ORDER_CREATED → PENDING → CAPTURED`

Alternative states: `FAILED`, `REFUND_PENDING`, `REFUNDED`, `DISPUTED`, `REVIEW_REQUIRED`.

Never change `CAPTURED` back to `PENDING` because an old webhook arrived late. Every transition must be idempotent and monotonic where appropriate.

---

# 12. Five-person team responsibilities

Every feature needs one primary owner, one integration interface and a known reviewer. The following split balances vertical ownership without leaving one member responsible for every backend feature.

| Person | Primary role | Owns | Must deliver |
|---|---|---|---|
| Member 1 | Design system, brand and frontend foundation | PROMPT 00/01, shared components, app shell, PWA shell and visual integration | Tokens, typography, reusable UI, landing page, responsive shell, accessibility review and component documentation |
| Member 2 | Customer product flow | VIEW-03, VIEW-05 to VIEW-09; customer API integration and quote/booking screens | Customer onboarding/profile/vehicles, booking flow, trip cockpit UI, receipt, history and report submission |
| Member 3 | Maps, routes and realtime location | Google Maps adapter, route preview, map UI integration, GPS endpoint/RTDB location path and stale-state logic | Map provider wrapper, route calculation, driver marker, location validation, realtime rules and real-device GPS test |
| Member 4 | Driver experience | VIEW-04, VIEW-11 to VIEW-15; driver-domain API integration | Driver onboarding UI, application status, availability, offer cards, trip cockpit UI, rates and earnings screens |
| Member 5 | Platform core, Admin and release integration | Firebase Auth middleware, Firestore schema, booking/trip/payment domain services, Admin, reports, security and CI/release | API contracts, shared state transitions, payment test integration, Admin portal, audit log, integration tests and deployment runbook |

### Avoid Member 5 becoming the only backend developer

Member 2 contributes the customer booking/vehicle API module. Member 3 owns the location API and RTDB rules. Member 4 contributes driver application/availability/offers API module. Member 5 owns shared architecture, reviews contracts and integrates the domain modules. Agree these module boundaries before parallel coding begins.

### Team-wide responsibilities

- Everyone writes tests for the module they own.
- Everyone reviews at least one other member's pull request.
- One person must not merge their own unreviewed changes to `main`.
- Do not edit the same shared component or API contract without agreeing who owns the file.
- Use mock API responses only behind a typed adapter and replace them when the endpoint is ready.

---

# 13. Git, integration and development workflow

## 13.1 Branching

- `main`: always demoable; protected.
- `develop`: shared integration branch.
- Feature branches: `feat/member-2-customer-booking`, `feat/member-3-map-gps`, etc.
- Bug branches: `fix/...`.
- Every feature branch uses a pull request into `develop`; reviewed, tested changes are merged to `main` before demos/releases.

## 13.2 Definition of done

A feature is not “done” because its page looks correct. It is done only when it has:

1. Responsive UI with loading, empty, error, success and disabled states.
2. API contract and backend permission checks.
3. Data persistence and state transitions.
4. Unit/integration coverage for important business rules.
5. Keyboard/accessibility checks.
6. No secrets in the repo and no obvious console/server errors.
7. Reviewer approval and updated documentation if a decision changed.

## 13.3 Suggested weekly sequence

1. **Foundation:** agree decision register, create repo, design tokens, routes, typed contracts and seeded mock data.
2. **Vertical slices:** auth/onboarding, then driver manual approval, then customer booking and driver offer acceptance.
3. **Trip lifecycle:** arrival, OTP, foreground GPS, completion and receipt.
4. **Payment/Admin:** Razorpay Test Mode, balance gate, reports and deactivation.
5. **Hardening:** tests, accessibility, mobile performance, error handling, demo data and deployment.

Do not split the team into five isolated UI-only assignments. Integrate against shared APIs and data from the first working slice.

---

# 14. Test and acceptance criteria

## 14.1 Product flow tests

- Customer passwordless email-link, phone OTP and Google sign-in; provider linking, profile bootstrap, FCM token registration and notification-permission fallback.
- Driver registration, document upload, pending status, Admin request-changes, resubmission, approval and rejection.
- Pending/rejected/deactivated driver cannot go online even by calling API directly.
- Customer creates vehicle and receives compatible driver results only.
- Instant offer expires after five minutes; rejection/timeout returns customer to selection.
- Two drivers accept a scheduled offer simultaneously; exactly one becomes assigned.
- Scheduled booking created more than 12 hours before pickup does not expire 12 hours after creation; broadcast begins at pickup minus 12 hours.
- Scheduled request with no acceptance changes to `NEEDS_REBOOK` at pickup minus two hours and shows recovery actions.
- Customer cannot change destination/stops after confirmation; pickup edit follows the approved rule and refreshes quote.
- Arrival timer begins only after server-confirmed arrival.
- Waiting fee boundary tests at 14:59, 15:00, 29:59 and 30:00.
- Customer no-show and waiting charge do not stack for the same event.
- Start OTP and End OTP are different, expire, have attempt limits and cannot be reused.
- GPS stale after 30 seconds; marker stops and shows last update time.
- Payment callback, signature mismatch, webhook duplicate, delayed webhook, failure, retry, captured payment and refund state.
- Due balance blocks booking; disputed balance follows the dispute rule, with the dispute linked to its ledger entry through `disputeStatus` and/or `linkedReportId`.
- Report privacy: reported party cannot discover reporter identity.
- Fifth verified driver no-show automatically suspends the driver; fifth qualifying customer cancellation automatically suspends the customer. Admin can inspect both histories and restore a customer through the audited Admin endpoint.
- Admin suspension/deactivation removes driver from eligibility immediately.
- Share token expiry/revocation, signed-out redirect to `/auth` with return URL, and rejection of invalid token hashes.
- SOS never shows SENT when no delivery provider confirms it.

## 14.2 Non-functional checks

The following are proposed engineering targets, not guaranteed outcomes:

- Landing page LCP: target ≤2.5s on a representative mid-range Android/4G test.
- Authenticated cockpit LCP: target ≤2.5s first; tighten only after measurement. Tighten the target only after the team measures map and bundle cost.
- Initial route JS budget: target ≤220 KB gzipped excluding deferred map/provider chunks; report actual size rather than hiding map bundles in a total.
- Map and GPS must remain usable under intermittent network conditions.
- No major layout shift when the map or bottom sheet loads.
- No uncontrolled battery-draining location loop.

Record device model, browser, network condition, date and measured result in the QA report.

## 14.3 Demo acceptance gate

The five-person team should be able to demonstrate, using seeded users and dummy documents:

1. Customer signs up and adds their car.
2. Driver signs up and submits documents.
3. Admin manually approves the driver.
4. Driver goes online.
5. Customer previews route, selects driver and creates booking.
6. Driver accepts and confirms arrival.
7. Start OTP verifies; location status is visible.
8. End OTP verifies; fare is calculated.
9. Razorpay Test Mode checkout succeeds or fails correctly.
10. Admin can inspect report and audit events.

If any core step is only a static screen or hard-coded success state, the MVP is not finished.

---

# 15. Approved owner decisions — DEC-01 to DEC-14

All decisions below were explicitly selected by the project owner on **9 November 2026**. Their status is `AGREED`. This decision record is authoritative wherever an earlier proposal elsewhere in this document conflicts with it.

**Approval owner:** Project owner.

| ID | Approved decision | Implementation requirement | Status | Approved | Owner |
|---|---|---|---|---|---|
| DEC-01 | No minimum fare and no minimum billable time | Charge actual usage only. Do not apply a minimum fare, minimum duration or minimum billing block. Hourly billing is proportional to actual elapsed trip time; Per KM billing uses validated actual trip distance. | AGREED | 9 Nov 2026 | Project owner |
| DEC-02 | Conditional pricing-mode activation | Keep `HOURLY` and `PER_KM` in the data model. Enable `HOURLY` in Release 1. Keep `PER_KM` disabled until GPS distance tracking passes testing and is approved for activation. | AGREED | 9 Nov 2026 | Project owner |
| DEC-03 | No driver rate limits | Drivers may set their own rates. Do not enforce platform-defined minimum or maximum driver rates in Release 1. Retain normal input validation and security protections. | AGREED | 9 Nov 2026 | Project owner |
| DEC-04 | No platform fees initially | Driver commission is 0%; customer platform fee is ₹0 in Release 1. | AGREED | 9 Nov 2026 | Project owner |
| DEC-05 | Custom cancellation and no-show accountability | Track verified driver no-shows and customer cancellations. Suspend the respective account on the fifth qualifying incident. Provide cancellation-reason dropdowns for customers and drivers. For scheduled bookings: cancellation before driver acceptance or within 5 minutes after acceptance is ₹0; after 5 minutes from acceptance it is ₹50; after driver arrival at pickup it is ₹100. Do not apply the superseded scheduled ₹100/₹200 time-to-pickup slabs. Instant-booking customer cancellation defaults to ₹0 in server configuration. No driver no-show monetary penalty was approved. | AGREED | 9 Nov 2026 | Project owner |
| DEC-06 | Waiting rule | First 15 minutes after verified driver arrival are free. Maximum wait is 30 minutes. Apply one ₹50 waiting charge when waiting exceeds 15 minutes and the trip starts before the no-show threshold. At 30 minutes without trip start, a validated customer no-show may incur ₹150 instead of the waiting charge; never stack both for the same event. | AGREED | 9 Nov 2026 | Project owner |
| DEC-07 | Driver arrival grace period | Instant booking: acceptance-time ETA plus 20 minutes. Scheduled booking: scheduled pickup time plus 20 minutes. Use the saved acceptance-time promise as the instant-booking baseline; do not keep shifting the deadline with live ETA changes. | AGREED | 9 Nov 2026 | Project owner |
| DEC-08 | Driver search radius | Start at 15 km. Offer the customer a control to expand the search radius if no suitable driver is available. Do not expand silently. | AGREED | 9 Nov 2026 | Project owner |
| DEC-09 | Simulated SOS in Release 1 | Record the SOS event and simulate the alert workflow in the demo. Clearly state that no external message or emergency-service notification has been sent. Add a real provider only after selection and testing. | AGREED | 9 Nov 2026 | Project owner |
| DEC-10 | Authentication required for shared ride location | A recipient opening a ride-share link must register or log in before viewing the location. Signed-out visitors are redirected to `/auth` with a return URL. After authentication, the valid share token hash is verified before returning the authenticated read-only location view. No separate 8-digit access code, recipient allowlist or per-share authorisation step is required. | AGREED | 9 Nov 2026 | Project owner |
| DEC-11 | Different retention periods by data type | Live location is retained only during an active ride. Completed ride history has its own retention period. Driver verification documents are retained while the account is active and for a defined period afterward. Exact historical/document periods and deletion schedule must be specified before real user data is collected. | AGREED | 9 Nov 2026 | Project owner |
| DEC-12 | Google Maps with 90-day $300 credit and strict cost control | Use the available $300 Google Cloud credit for 90 days, subject to account eligibility and current terms. Enable required Maps functionality for Release 1, monitor API/SKU usage, configure quotas and billing alerts, and prevent paid usage beyond the approved credit. Budget alerts alone are not a hard spending cap; restrict or disable services at the approved limit where technically possible. | AGREED | 9 Nov 2026 | Project owner |
| DEC-13 | Firebase/Google Cloud-first hosting | Host the Next.js PWA on Firebase App Hosting and deploy the single Express modular-monolith API as a Firebase Cloud Functions (2nd gen) HTTPS `onRequest` function. Use separate Cloud Functions for scheduled/event-driven jobs. Use Cloud Storage for Firebase for private uploads and Firebase Cloud Messaging for web push. Configure Firebase App Check and Google Cloud Secret Manager/runtime service identity. Remove Cloudflare R2, Vercel and Render from Release 1. Firebase App Hosting and Cloud Storage require the Blaze plan; verify $300 credit eligibility/coverage, quotas, budgets and spend controls before enabling paid services. Validate supported regions, cold starts and service limits before production. Current published Firebase App Hosting Asia regions are Singapore (`asia-southeast1`) and Taiwan (`asia-east1`), with no India region listed; if Firestore/Storage are in Mumbai (`asia-south1`), the current Functions location guide maps them to Hong Kong (`asia-east2`) as the nearest supported Functions region. Treat this as a pre-provisioning region decision and benchmark cross-region latency/cost before creating resources with immutable locations. | AGREED — UPDATED | 9 Nov 2026 | Project owner |
| DEC-14 | Defer tax and invoice functionality | Tax calculation, tax-compliant invoice generation and related commercial compliance functionality are outside Release 1. Revisit after the business model and applicable legal requirements have been established. | AGREED | 9 Nov 2026 | Project owner |

## 15.1 Implementation notes and remaining details

- The fifth-incident suspension threshold needs a durable incident counter and audit trail for each account. A rolling time window has not been specified; do not invent one. Define incident qualification/verification and any appeal or restoration process before production use.
- DEC-05 explicitly defines scheduled-booking customer cancellation fees. Instant-booking customer cancellation fees default to ₹0 in server configuration unless a later decision approves a change. Driver no-shows are tracked for suspension, not monetarily penalised under the approved decision.
- DEC-06 establishes a customer no-show charge of ₹150 as part of the accepted waiting policy. It replaces, rather than stacks with, the ₹50 waiting charge for the same event.
- DEC-11 selects the retention approach, not exact retention durations. Complete and approve the detailed schedule before processing real personal data.
- DEC-12 is a strict credit-bounded implementation choice, not permission for open-ended paid usage after the credit expires. Verify the actual Cloud account credit, eligible services, billing and Google Maps Platform terms before deployment.
- DEC-14 means tax and invoice features must not be presented as implemented Release 1 functionality.

- Firebase App Hosting and Cloud Storage for Firebase require the Blaze pay-as-you-go plan. Confirm the Google Cloud billing account is linked and verify the $300 credit's eligibility, remaining balance, expiration and service coverage before enabling these services. Credit is not an unlimited spending cap; configure budgets, alerts and service-specific spend controls.
- Use Firebase Cloud Messaging for web push notifications where the user grants permission. Keep notification records/status in Firestore; push delivery is a notification channel, not the source of truth. Provide in-app notification fallback when browser push is unavailable or permission is denied.

