# Veyro

**Your keys. Our pro. Zero traffic stress.**

Veyro connects a customer who owns a vehicle with an independent professional driver who provides the driving service. The customer provides the vehicle. The driver provides the driving service.

Veyro is not a taxi fleet, car-rental service or driver-owned vehicle marketplace.

## Release 1

- **Platform:** Responsive Progressive Web App (PWA)
- **Project type:** Five-person college capstone
- **Status:** Runnable end to end locally. Customer booking, driver offers and trips, OTP start/end, payments, ratings, reports, demo SOS, trip sharing and the admin console all work.

## Run it locally

Prerequisites: Node.js 20+ and pnpm 9+. No cloud accounts or API keys are needed.

```bash
pnpm install
pnpm dev:api    # Express API on http://localhost:4000
pnpm dev:web    # Next.js PWA on http://localhost:3000 (proxies /api/v1 to the API)
```

Open http://localhost:3000/auth and pick a demo account. In development the one-time sign-in code is shown on screen.

| Account | Role |
|---|---|
| `customer@veyro.test` | Customer with two vehicles and emergency contacts |
| `driver@veyro.test` | Approved driver (Park Street, ₹220/hr) |
| `driver2@veyro.test` | Approved driver (Salt Lake, manual only, ₹180/hr) |
| `driver3@veyro.test` | Approved driver (Gariahat, ₹260/hr) |
| `applicant@veyro.test` | Driver application waiting for review |
| `admin@veyro.test` | Admin console |

Any other email creates a new customer or driver account.

**Demo tip:** each browser tab keeps its own session. Sign in as the customer in one tab and as `driver@veyro.test` in another. On the driver screen choose **Demo GPS** to simulate movement when the browser has no real location. Seeded drivers also move on their own (the simulator) until a device takes over.

### Local substitutes for the cloud services

The specification targets Firebase, Google Maps and Razorpay. The local build keeps the same rules but swaps the providers:

| Spec | Local build |
|---|---|
| Firebase Auth | Email one-time code (hashed, 10 min, 5 attempts) and signed session tokens. Phone and Google sign-in show as needing Firebase setup. |
| Firestore / Realtime DB | JSON store in `apps/api/.data/db.json` with atomic writes. Reset with `pnpm --filter @veyro/api reset-data`. |
| Cloud Storage | Private files in `apps/api/.data/uploads`, served to admins through signed, expiring links. |
| Google Maps | OpenStreetMap tiles (Leaflet), OSRM routing and Nominatim search, with a built-in Kolkata gazetteer and offline estimates as fallback. |
| Razorpay | Razorpay Test Mode if `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are set; otherwise a demo capture (no money moves). |
| Cloud Functions schedulers | An in-process sweep every 4 s: offer expiry, scheduled broadcast windows, needs-rebook, share-link revocation. |

Optional settings are documented in `apps/api/.env.example` and `apps/web/.env.example`. Set `ROUTING=offline` and `GEOCODER=offline` to run without internet access.

### Tests

```bash
pnpm --filter @veyro/api test   # unit tests + full HTTP end-to-end flow
pnpm --filter @veyro/web build  # type-check and production build
```

## Tech Stack (target production architecture)

| Layer | Technology |
|---|---|
| Frontend | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS, lucide icons |
| API | Node.js, Express.js, TypeScript |
| Identity | Firebase Authentication (passwordless email-link, phone OTP, Google) |
| Database | Cloud Firestore (durable) + Firebase Realtime Database (ephemeral) |
| Storage | Cloud Storage for Firebase |
| Maps | Google Maps Platform |
| Payments | Razorpay Test Mode |
| Hosting | Firebase App Hosting (frontend) + Cloud Functions 2nd gen (API) |

## Repository Structure

```
veyro/
├── apps/web/          # Next.js App Router PWA
├── apps/api/          # Express + TypeScript backend
├── functions/         # Firebase Cloud Functions (scheduled/event-driven)
├── packages/
│   ├── contracts/     # Shared TypeScript DTOs and API types
│   ├── ui/            # Shared UI components and design tokens
│   └── config/        # Shared lint/tsconfig/tailwind configuration
├── infra/             # Firebase rules, indexes, deployment config
├── docs/              # Specifications and project management
├── openspec/          # OpenSpec specification management
└── veyro-logo-assets/ # Logo and brand assets
```

## Documentation

- [Unified Specification v3.6](docs/veyro.md) — Product, UI/UX, business logic and architecture
- [Backend Technical Specification v1.3](docs/veyro_backend.md) — Backend implementation design
- [Project Status](docs/project-management/PROJECT_STATUS.md) — Milestone tracking
- [Frontend Progress](docs/project-management/FRONTEND_PROGRESS.md) — Frontend task tracker
- [Backend Progress](docs/project-management/BACKEND_PROGRESS.md) — Backend task tracker

## License

[MIT](LICENSE) — © 2026 Anupam Bhowmik

