# Veyro

**Your keys. Our pro. Zero traffic stress.**

Veyro connects a customer who owns a vehicle with an independent professional driver who provides the driving service. The customer provides the vehicle. The driver provides the driving service.

Veyro is not a taxi fleet, car-rental service or driver-owned vehicle marketplace.

## Release 1

- **Platform:** Responsive Progressive Web App (PWA)
- **Project type:** Five-person college capstone
- **Status:** Pre-development — repository scaffold in progress

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS, shadcn/ui, Radix UI |
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

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Firebase CLI (`npm install -g firebase-tools`)

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment files
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env.local

# Start development servers
pnpm dev:web    # Next.js on http://localhost:3000
pnpm dev:api    # Express on http://localhost:4000
```

## Documentation

- [Unified Specification v3.6](docs/veyro.md) — Product, UI/UX, business logic and architecture
- [Backend Technical Specification v1.3](docs/veyro_backend.md) — Backend implementation design
- [Project Status](docs/project-management/PROJECT_STATUS.md) — Milestone tracking
- [Frontend Progress](docs/project-management/FRONTEND_PROGRESS.md) — Frontend task tracker
- [Backend Progress](docs/project-management/BACKEND_PROGRESS.md) — Backend task tracker

## License

[MIT](LICENSE) — © 2026 Anupam Bhowmik

