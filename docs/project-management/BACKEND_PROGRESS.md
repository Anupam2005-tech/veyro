# Veyro — Backend Progress Tracker

**Last updated:** 9 November 2026  
**Stack:** Node.js + Express.js + TypeScript, Firebase Admin SDK, Cloud Firestore, RTDB, Cloud Storage  
**Spec reference:** `docs/veyro_backend.md` §2–17; `docs/veyro.md` §4–5, §6 (PROMPT 07)  

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

## M0 — Foundation (Backend spec §16 step 1–2)

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| BE-FND-001 | Express app scaffold (`app.ts`, `server.ts`) | NOT_STARTED | Member 5 | FND-007 | Modular monolith architecture |
| BE-FND-002 | Central config module (`config/env.ts`) with startup validation | NOT_STARTED | Member 5 | BE-FND-001 | dotenv locally |
| BE-FND-003 | Firebase Admin SDK init (`config/firebase-admin.ts`) | NOT_STARTED | Member 5 | BE-FND-002 | Shared singleton instance |
| BE-FND-004 | Global error middleware + AppError class hierarchy | NOT_STARTED | Member 5 | BE-FND-001 | Safe client responses |
| BE-FND-005 | Request context middleware (requestId tracking) | NOT_STARTED | Member 5 | BE-FND-001 | Attach `req.id`, `X-Request-Id` |
| BE-FND-006 | Response helpers (`sendSuccess`, `sendError`) | NOT_STARTED | Member 5 | BE-FND-004 | Canonical envelope format |
| BE-FND-007 | CORS configuration | NOT_STARTED | Member 5 | BE-FND-001 | Whitelisted origins only |
| BE-FND-008 | Health endpoint (`GET /api/v1/health`) | NOT_STARTED | Member 5 | BE-FND-001 | Non-sensitive status check |
| BE-FND-009 | express-validator middleware setup | NOT_STARTED | Member 5 | BE-FND-001 | Array details format |
| BE-FND-010 | OpenAPI/Swagger setup (`docs/openapi.yaml`, Swagger UI) | NOT_STARTED | Member 5 | BE-FND-001 | Interactive API documentation |

---

## M1 — Identity & Access (Backend spec §16 step 3)

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| BE-001 | Firebase Auth middleware (`authenticate.ts`) | NOT_STARTED | Member 5 | BE-FND-003 | Verify Bearer ID token |
| BE-002 | Role middleware (`require-role.ts`) | NOT_STARTED | Member 5 | BE-001 | CUSTOMER, DRIVER, ADMIN |
| BE-003 | Auth module — `POST /api/v1/auth/session` profile bootstrap | NOT_STARTED | Member 5 | BE-001 | Sync Firebase Auth with Firestore |
| BE-004 | App Check middleware (verify limited-use token) | NOT_STARTED | Member 5 | BE-FND-003 | `X-Firebase-AppCheck` header |

---

## M1 — Core Data Modules (Backend spec §16 step 4)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-005 | Customer module (CRUD, profile, status) | `customers/` | NOT_STARTED | Member 2 | BE-001 | |
| BE-006 | Vehicle module (CRUD, compatibility attributes) | `vehicles/` | NOT_STARTED | Member 2 | BE-005 | Category, transmission |
| BE-007 | Driver module (profile, capabilities, rates, service areas) | `drivers/` | NOT_STARTED | Member 4 | BE-001 | HOURLY active, PER_KM stored |
| BE-008 | Application module (submission, review, document metadata) | `applications/` | NOT_STARTED | Member 4 | BE-007 | PENDING_REVIEW state |
| BE-009 | Document upload completion endpoint | `applications/` | NOT_STARTED | Member 4 | BE-008 | Storage path validation |
| BE-010 | Availability module (online/offline, eligibility check) | `availability/` | NOT_STARTED | Member 4 | BE-007 | Server-side eligibility checks |

---

## M2 — Booking Core (Backend spec §16 step 5)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-011 | Quote module (fare estimate, snapshot) | `quotes/` | NOT_STARTED | Member 2 | BE-006, BE-010 | Actual usage formula |
| BE-012 | Booking module — creation, state machine | `bookings/` | NOT_STARTED | Member 5 | BE-011 | Atomic state transitions |
| BE-013 | Instant offer lifecycle (5-min expiry, atomic accept) | `bookings/` | NOT_STARTED | Member 5 | BE-012 | Firestore transaction |
| BE-014 | Scheduled booking lifecycle (broadcast timing, NEEDS_REBOOK) | `bookings/` | NOT_STARTED | Member 5 | BE-012 | Pickup-12h to pickup-2h |
| BE-015 | Cancellation module (policy calculation, reason recording) | `bookings/` | NOT_STARTED | Member 5 | BE-012 | DEC-05 slabs |

---

## M3 — Trip Core (Backend spec §16 step 6)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-016 | Trip module — state machine, arrival confirmation | `trips/` | NOT_STARTED | Member 5 | BE-012 | Geofence verification |
| BE-017 | Waiting timer and no-show logic | `trips/` | NOT_STARTED | Member 5 | BE-016 | 15m free, 30m max, ₹50/₹150 |
| BE-018 | Start/End OTP (generate, hash, verify, consume) | `trips/` | NOT_STARTED | Member 5 | BE-016 | Separate, single-use codes |
| BE-019 | GPS location endpoint + RTDB write | `trips/` | NOT_STARTED | Member 3 | BE-016 | Stale cutoff 30s |
| BE-020 | Share links module (token, hash, revoke, expiry) | `share-links/` | NOT_STARTED | Member 2 | BE-016 | Authenticated read-only view |

---

## M4 — Payments & Safety (Backend spec §16 step 7)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-021 | Payment module — Razorpay order creation | `payments/` | NOT_STARTED | Member 5 | BE-016 | Test Mode only |
| BE-022 | Payment signature + webhook verification | `payments/` | NOT_STARTED | Member 5 | BE-021 | Raw body signature check |
| BE-023 | Webhook deduplication + idempotent transitions | `payments/` | NOT_STARTED | Member 5 | BE-022 | Stable event ID tracking |
| BE-024 | Outstanding balance gate | `payments/` | NOT_STARTED | Member 5 | BE-023 | Block new booking on balance |
| BE-025 | Report module (submission, privacy, Admin resolution) | `reports/` | NOT_STARTED | Member 5 | BE-001 | Reporter identity concealed |
| BE-026 | SOS module (event recording, demo mode) | `sos/` | NOT_STARTED | Member 5 | BE-016 | Demo SOS messaging |
| BE-027 | 5th-incident suspension automation | `admin/` | NOT_STARTED | Member 5 | BE-015, BE-017 | Driver no-show & customer cancel |
| BE-028 | Notification module (Firestore records + FCM) | `notifications/` | NOT_STARTED | Member 5 | BE-001 | Push fallback to in-app |
| BE-029 | Audit module (append-only Admin action log) | `audit/` | NOT_STARTED | Member 5 | BE-001 | Immutable event log |

---

## M4 — Admin (Backend spec §16 step 7)

| Task ID | Description | Module | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|---|
| BE-030 | Admin application review (approve/reject/request-changes) | `admin/` | NOT_STARTED | Member 5 | BE-008, BE-029 | Mandatory audit reason |
| BE-031 | Admin driver controls (deactivate/restore) | `admin/` | NOT_STARTED | Member 5 | BE-007, BE-029 | Audited status changes |
| BE-032 | Admin customer controls (view/restore) | `admin/` | NOT_STARTED | Member 5 | BE-005, BE-029 | Restore endpoint |
| BE-033 | Admin report resolution | `admin/` | NOT_STARTED | Member 5 | BE-025, BE-029 | Resolution note required |

---

## M5 — Background Functions & Testing (Backend spec §16 steps 8–9)

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| BE-034 | Scheduled booking/offer expiry function | NOT_STARTED | Member 5 | BE-013, BE-014 | 2nd-gen Cloud Function |
| BE-035 | Scheduled broadcast lifecycle function | NOT_STARTED | Member 5 | BE-014 | Idempotent broadcast transitions |
| BE-036 | RTDB presence/location cleanup function | NOT_STARTED | Member 5 | BE-019 | Prune inactive trip trails |
| BE-037 | Firestore-trigger notification handlers | NOT_STARTED | Member 5 | BE-028 | FCM delivery dispatcher |
| BE-038 | Unit tests — fare, waiting, cancellation, OTP, suspension | NOT_STARTED | All | M2–M4 modules | Jest unit suite |
| BE-039 | Integration tests — auth, roles, Firestore transactions | NOT_STARTED | All | M1–M4 modules | Supertest + emulator |
| BE-040 | Security tests — cross-user access, RTDB, share-token | NOT_STARTED | Member 5 | M3–M4 modules | Access boundary verification |

---

## Infrastructure

| Task ID | Description | Status | Owner | Depends on | Notes |
|---|---|---|---|---|---|
| INF-001 | Firestore Security Rules (deny-by-default) | NOT_STARTED | Member 5 | FND-013 | Restrictive client rules |
| INF-002 | RTDB Security Rules (deny-by-default) | NOT_STARTED | Member 5 | FND-013 | Location path scoping |
| INF-003 | Storage Security Rules (deny-by-default) | NOT_STARTED | Member 5 | FND-013 | Private document paths |
| INF-004 | Firestore composite indexes | NOT_STARTED | Member 5 | BE-012 | `firestore.indexes.json` |
| INF-005 | Firebase Emulator Suite configuration | NOT_STARTED | Member 5 | FND-014 | Local testing harness |
| INF-006 | Firebase App Hosting deployment config | NOT_STARTED | Member 5 | FND-006, FND-014 | `apphosting.yaml` |
| INF-007 | Cloud Functions deployment config | NOT_STARTED | Member 5 | FND-008, FND-014 | Runtime service identity |

