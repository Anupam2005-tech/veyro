# Veyro Backend Technical Specification — Release 1

**Version:** 1.3 — Google Cloud/Firebase infrastructure and passwordless authentication revision; synchronised with Unified Specification v3.6  
**Prepared:** 9 November 2026  
**Status:** Revised Google Cloud/Firebase implementation baseline; passwordless authentication and Firebase hosting selected  
**Project:** Veyro — Release 1  
**Team context:** Five-person college project / capstone

---

## 1. Purpose and authority

This document converts the 14 approved Veyro Backend Architecture decisions into an implementation-ready backend specification.

It is the companion technical specification to the approved **Veyro Release 1 Unified Specification v3.6** for product behaviour, safety rules, pricing, booking states, trip flows and feature scope. The two documents have been reviewed together; this specification supplies the detailed backend implementation choices and the unified specification remains authoritative for product behaviour and business policy.

Do not use this document to invent unresolved commercial policies. Values still marked as baseline proposals or owner decisions in the unified specification must remain configurable and must not be silently treated as approved business policy.

### 1.1 Release 1 architectural principles

1. One modular-monolith Express API owns authoritative business logic and is deployed as an HTTPS endpoint through Firebase Cloud Functions (2nd gen).
2. Firebase Authentication provides passwordless email-link, phone OTP and Google Sign-In.
3. Cloud Firestore is the durable source of truth.
4. Firebase Realtime Database (RTDB) stores only ephemeral presence and current active-trip location.
5. Cloud Storage for Firebase stores private profile images and driver verification documents.
6. Firebase Cloud Functions handle both the Express HTTPS API deployment and scheduled/event-driven background work, using separate function entry points.
7. Firebase App Hosting hosts the Next.js PWA; Firebase Cloud Functions hosts the Express API. Both are deployed and managed through the Firebase/Google Cloud ecosystem.
8. Google Maps Platform provides maps, Places, geocoding and route services; Firebase App Check protects supported Firebase services, Maps integrations where supported, and the custom Express API through explicit token verification.
9. No Cloudflare, Vercel, Render, MongoDB, second durable database, Socket.IO server, custom WebSocket server, Redis/BullMQ queue or microservice split is introduced in Release 1.

---

## 2. Approved backend architecture decisions

All 14 decisions below are recorded as selected by the project owner.

| # | Area | Approved choice | Implementation outcome |
|---|---|---|---|
| 1 | Architecture style | Option 1 — Modular Monolith | One Node.js + Express.js + TypeScript API, separated into domain modules. |
| 2 | Internal module structure | Option 1 — Strict Layered Structure | Each module uses routes, controllers, services, repositories, models/types and validators. |
| 3 | API versioning | Option A — URL versioning | Canonical API prefix: `/api/v1/`. |
| 4 | Request validation | Option C — express-validator | Validate route params, query strings and request bodies using module-owned express-validator chains. |
| 5 | API documentation | Option A — Swagger/OpenAPI | Maintain an OpenAPI contract and Swagger UI for endpoints, schemas, auth and errors. |
| 6 | API response format | Option A — Standard JSON | Use a consistent success and error envelope; include pagination metadata only where relevant. |
| 7 | Error management | Option A — Centralised global middleware | Custom application errors and one final Express error handler produce consistent safe responses. |
| 8 | Logging and monitoring | Option C — Basic console logging + Google Cloud Logs | Use `console.log`, `console.warn` and `console.error`; use the Google Cloud Logging integration provided by Firebase/Google Cloud runtimes; no third-party logging platform in Release 1. |
| 9 | Environment/configuration | Option A — dotenv locally + Firebase/Google Cloud runtime configuration and Secret Manager | Central config module, startup validation and `.env.example`; use runtime service identity/Application Default Credentials and Secret Manager for production secrets; never commit secrets. |
| 10 | Firebase backend connection | Option A — Centralised Firebase Admin SDK | Initialise Admin SDK once and share Auth ID-token/App Check verification, Firestore, RTDB and Storage clients. |
| 11 | Authentication/authorisation | Option A — Firebase token verification + role middleware | Verify Firebase ID tokens and apply central role middleware plus resource-level authorisation. |
| 12 | Database security | Option A — Strict Firebase Security Rules + backend validation | Deny-by-default Firestore/RTDB/Storage rules, Express validation and explicit server-side authorisation. |
| 13 | Firebase Cloud Functions runtime | Option A — Firebase Cloud Functions | Deploy the single Express API as a 2nd-gen HTTPS `onRequest` function and use separate functions for scheduled/event-triggered work. |
| 14 | Testing strategy | Option A — Essential automated testing | Jest and Supertest for critical services and APIs, with manual end-to-end release checks where appropriate. |

### 2.1 Decision interpretation rules

- The selected strict layered structure is a code organisation rule, not a requirement to create a separate deployment for every module.
- Role middleware checks broad application roles. Services/repositories must still enforce ownership and resource-specific access.
- “Strict Firebase rules” does not mean the browser can write arbitrary business state. Sensitive mutations and business transitions remain server-controlled.
- Firebase Admin SDK bypasses Firebase Security Rules. Therefore, every Admin SDK write must be preceded by Express/Cloud Function authorisation and validation appropriate to that operation.
- Cloud Functions are a separate background execution surface, not a second general-purpose API.
- Essential automated testing is the selected Release 1 strategy; it does not mean every UI journey must have a large automated browser suite. Critical business logic and API boundaries must be automated, and the full customer/driver/Admin journey must be exercised with a repeatable manual release checklist.

---

## 3. Technology stack

**Infrastructure lock (9 November 2026):** Next.js frontend on Firebase App Hosting; Express REST API on Firebase Cloud Functions (2nd gen) HTTPS `onRequest`; scheduled/event-driven work on separate Cloud Functions; Firebase Authentication passwordless email link + phone OTP + Google; Firestore, RTDB and Firebase Storage; Google Maps Platform; Firebase App Check with reCAPTCHA Enterprise for web; Razorpay Test Mode remains the payment provider.


| Layer | Technology | Release 1 responsibility |
|---|---|---|
| Frontend | Next.js App Router, React, TypeScript | Customer, Driver, Admin and public PWA |
| API runtime | Node.js, Express.js, TypeScript | Business logic, REST endpoints, authorisation and integrations |
| API prefix | `/api/v1/` | Versioned backend endpoints |
| Identity | Firebase Authentication | Passwordless email-link sign-in, phone-number OTP sign-in and Google Sign-In; link providers to one Veyro account where appropriate |
| Server Firebase SDK | Firebase Admin SDK | ID token verification, Firestore/RTDB privileged operations and server-side Firebase integration |
| Durable database | Cloud Firestore | Users, vehicles, driver applications, bookings, trips, payments, reports, notifications and audit events |
| Ephemeral realtime data | Firebase Realtime Database | Driver presence and latest active-trip location only |
| File storage | Cloud Storage for Firebase | Private driver verification documents, profile images and approved uploads, protected by Storage Security Rules and backend authorisation |
| Maps | Google Maps Platform | Map rendering, Places/address search, geocoding and route calculation |
| Push notifications | Firebase Cloud Messaging (FCM) | Web push delivery for approved booking, trip and account events; Firestore notification records remain authoritative |
| Payments | Razorpay Test Mode | Server-created orders, signature/webhook verification and test checkout |
| Background execution | Firebase Cloud Functions | Express HTTPS API plus scheduled and event-driven jobs through separate function entry points |
| Frontend hosting | Firebase App Hosting | Next.js App Router PWA with GitHub-connected build and deployment |
| Backend hosting | Firebase Cloud Functions (2nd gen) | Express modular monolith exposed through an HTTPS function under `/api/v1/`; separate scheduled/event-triggered functions |
| API documentation | OpenAPI + Swagger UI | Contract and interactive API documentation |
| Validation | express-validator | Request body, query and route parameter validation |
| Tests | Jest + Supertest | Unit/service and HTTP integration tests |
| Web performance | Firebase Performance Monitoring | Monitor web app performance and key page/network traces where supported |
| Analytics | Google Analytics for Firebase | Consent-aware, privacy-safe product events; never send PII, trip locations or identity-document data |
| Local configuration | dotenv | Local environment loading |

**Not selected for Release 1:** Cloudflare products, Vercel, Render, MongoDB/Atlas, Socket.IO, custom WebSockets, Redis/BullMQ, microservices, email/password credentials, a custom JWT identity system, Pino/Winston or a third-party observability suite.

---

## 4. System architecture and responsibilities

### 4.1 Request flow

1. The frontend authenticates the user with Firebase Authentication.
2. For a protected API request, the frontend sends the Firebase ID token in `Authorization: Bearer <token>`.
3. Express authentication middleware verifies the token using the centrally initialised Firebase Admin SDK.
4. Role middleware checks the backend-managed role and account/application status.
5. The route validator checks parameters, query values and body fields.
6. The controller translates HTTP input into a service call.
7. The service applies business rules, ownership checks and transaction boundaries.
8. The repository performs Firestore/RTDB operations through the shared Admin SDK clients.
9. The controller returns the standard response envelope.
10. The global error middleware handles any thrown/rejected application error.

Public routes may omit authentication only when explicitly documented as public. They must still validate input and apply suitable abuse protection.

### 4.2 Data ownership

**Firebase Authentication**
- Owns authentication identity and provider credentials.
- Does not own Veyro's product role, driver approval status or booking permissions.

**Cloud Firestore**
- Authoritative durable source of truth.
- Owns customer/driver profiles, vehicles, driver applications, availability state where durable, booking and trip lifecycle, fare snapshots, OTP hashes/metadata, payment records, reports, notifications and Admin audit events.
- Booking/payment lifecycle state must not be duplicated into RTDB.

**Firebase Realtime Database**
- Temporary driver presence and latest accepted active-trip location sample only.
- Not a source of truth for trip assignment, booking state or payment state.
- No long raw GPS trail by default.

**Cloud Storage for Firebase**
- Owns private uploaded file bytes for driver identity/licence documents, profile images and other approved uploads.
- Firestore stores file metadata, storage paths, owner UID, content type, size, review status and timestamps; do not store public document URLs.
- Use Firebase Storage SDK with restrictive Storage Security Rules for permitted owner uploads/reads; use privileged backend/Admin SDK access for Admin review and sensitive document retrieval.
- Validate file size, content type, extension, ownership and upload state server-side; keep identity documents private and never expose permanent public download links.

### 4.3 Realtime GPS flow

1. Driver app obtains location permission and sends a sample every 5–10 seconds while an active trip is foregrounded and permission is granted.
2. Driver sends the sample to an authenticated Express endpoint.
3. Express verifies the Firebase ID token.
4. The service confirms the authenticated driver is assigned to the active trip according to Firestore.
5. The service validates coordinates, timestamp, accuracy and implausible jumps.
6. The latest accepted sample is written to the appropriate RTDB path.
7. The customer and permitted authenticated trip-share view may read only the location path for that specific active trip, subject to narrow RTDB rules and the access model.
8. Firestore remains authoritative for whether the trip is active and who is entitled to see it.
9. Stop location sharing after completion, cancellation or revocation. Display a stale state when no valid update has arrived for 30 seconds; never simulate movement.

Do not introduce Socket.IO or another custom WebSocket server. RTDB provides the selected realtime channel.

---

## 5. Express application structure

Use a single API application with strict module boundaries and consistent layers.

```text
apps/
  api/
    src/
      app.ts
      server.ts

      config/
        env.ts
        firebase-admin.ts
        firebase-storage.ts
        razorpay.ts
        maps.ts

      middleware/
        authenticate.ts
        require-role.ts
        validate-request.ts
        not-found.ts
        error-handler.ts
        request-context.ts

      modules/
        auth/
          routes/
          controllers/
          services/
          repositories/
          models/
          validators/

        customers/
        vehicles/
        drivers/
        applications/
        availability/
        quotes/
        bookings/
        trips/
        payments/
        reports/
        share-links/
        sos/
        notifications/
        admin/
        audit/

      shared/
        errors/
        http/
        types/
        utils/

      docs/
        openapi.yaml

    tests/
      unit/
      integration/
      fixtures/

    package.json
    tsconfig.json
    .env.example

  functions/
    src/
      index.ts
      api.ts                  # exports the Express app through an HTTPS onRequest function
      scheduled/
      firestore-triggers/
      shared/
    package.json
    tsconfig.json

infra/
  firebase/
    firestore.rules
    firestore.indexes.json
    database.rules.json
    storage.rules
    emulator/
  firebase.json
  .firebaserc
  apphosting.yaml
  scripts/

docs/
  backend-technical-specification.md
  api-contracts.md
  data-model.md
  test-plan.md
```

### 5.1 Layer responsibilities

| Layer | Responsibility | Must not do |
|---|---|---|
| Routes | Declare HTTP method/path, middleware order and controller | Contain business rules or database queries |
| Controllers | Read validated input, call services, map result to HTTP response | Calculate fares or directly mutate Firestore |
| Services | Business rules, authorisation, orchestration and transaction decisions | Depend on Express request/response objects |
| Repositories | Encapsulate Firestore/RTDB queries and writes | Decide product policy or trust client-supplied roles |
| Models/types | Domain types, DTOs and persistence shapes | Become a second source of business logic |
| Validators | express-validator chains and sanitisation | Replace service-level invariant checks |
| Middleware | Authentication, role checks, request validation, error handling | Be bypassed by a controller-specific shortcut |

Keep modules cohesive. Avoid circular dependencies and direct cross-module repository access. A module should call another module's service interface where cross-domain work is required.

---

## 6. API conventions

### 6.1 Versioning and route naming

All API routes use:

```text
/api/v1/
```

Use plural resource paths and standard HTTP methods. Examples:

```text
GET    /api/v1/customers/me
PATCH  /api/v1/customers/me
GET    /api/v1/vehicles
POST   /api/v1/vehicles
POST   /api/v1/driver-applications
GET    /api/v1/driver-applications/me
GET    /api/v1/drivers/offers
POST   /api/v1/bookings/quotes
POST   /api/v1/bookings
GET    /api/v1/bookings/:bookingId
POST   /api/v1/bookings/:bookingId/accept
POST   /api/v1/trips/:tripId/arrivals
POST   /api/v1/trips/:tripId/start
POST   /api/v1/trips/:tripId/complete
POST   /api/v1/trips/:tripId/location
POST   /api/v1/payments/orders
POST   /api/v1/payments/verify
POST   /api/v1/payments/webhooks/razorpay
POST   /api/v1/reports
GET    /api/v1/admin/applications
POST   /api/v1/admin/applications/:applicationId/approve
POST   /api/v1/admin/applications/:applicationId/reject
GET    /api/v1/admin/reports
```

These are naming examples, not a complete endpoint contract. Publish the final endpoint list and schemas in OpenAPI before frontend integration.

### 6.2 Standard success response

```json
{
  "success": true,
  "message": "Booking retrieved successfully.",
  "data": {
    "id": "booking_id",
    "status": "CONFIRMED"
  }
}
```

### 6.3 Standard error response

```json
{
  "success": false,
  "message": "The request could not be completed.",
  "error": {
    "code": "BOOKING_NOT_ACCESSIBLE",
    "details": []
  }
}
```

Do not return stack traces, database internals, secrets, token contents or private provider errors to clients. `details` should contain safe field-level validation information only.

### 6.4 Pagination

For list endpoints that need pagination, return pagination information inside `data` or a documented `meta` object. Do not add empty pagination fields to every response.

### 6.5 HTTP status conventions

- `200` successful read/update/action with a response body.
- `201` resource created.
- `204` successful operation with no response body, only where useful.
- `400` malformed or invalid request.
- `401` missing/invalid authentication.
- `403` authenticated but not authorised.
- `404` resource absent or intentionally concealed from an unauthorised caller.
- `409` state conflict, duplicate action or race lost.
- `422` semantically invalid business operation where a distinct response is useful.
- `429` rate limit exceeded.
- `500` unexpected internal failure.
- `503` temporary dependency/service unavailability.

---

## 7. Validation, errors and logging

### 7.1 Request validation — express-validator

Use express-validator chains per module for:
- Route parameters.
- Query parameters.
- Request body fields.
- Type, format, length, allowed values and required-field checks.
- Normalisation/sanitisation where appropriate.

A shared validation middleware must collect validation errors and return the standard error envelope. Services must still validate business invariants, ownership, state transitions and cross-field rules. Request validation is not a substitute for domain validation.

Do not mix express-validator and Zod as competing request-validation frameworks in Release 1. If a future shared type package is needed, use TypeScript DTOs/interfaces or a separately approved contract strategy without silently reintroducing Zod validation.

### 7.2 Error architecture

- Create a base `AppError` with safe message, HTTP status, stable error code and optional safe details.
- Add domain-specific errors where useful (for example `BookingConflictError`, `ForbiddenResourceError`, `PaymentVerificationError`).
- Use async route handling consistently.
- Add not-found middleware after all routes.
- Add one final global error handler.
- Log unexpected errors server-side; return a generic safe message to the client.
- Do not swallow errors or return success-shaped responses after failures.

### 7.3 Logging

Use built-in console methods. Firebase/Google Cloud runtimes route stdout/stderr to Google Cloud Logging; use Cloud Logging for operational review without adding Pino/Winston.

- `console.log`: key lifecycle events and normal operational messages.
- `console.warn`: recoverable unexpected conditions, stale integrations and rejected invalid transitions.
- `console.error`: unexpected exceptions and failed critical operations.

Never log Firebase ID tokens, App Check tokens, refresh tokens, OTP digits, raw share tokens, payment secrets, credentials, full identity-document content or unnecessary personal data. Use request IDs and non-sensitive resource identifiers where needed. Do not add Pino, Winston or a third-party monitoring stack in Release 1.

---

## 8. Authentication and authorisation

### 8.1 Firebase ID token verification

- Frontend obtains the Firebase ID token from the authenticated Firebase client session.
- Send it using `Authorization: Bearer <firebase-id-token>`.
- Express verifies it with Firebase Admin SDK `verifyIdToken`.
- Reject missing, expired, invalid or revoked tokens according to the configured verification policy.
- Do not accept a user ID or role supplied in the request body as proof of identity.
- Do not create a separate custom JWT login/session system.

### 8.1.1 Passwordless sign-in providers

Release 1 supports exactly these Firebase Authentication methods:

1. **Email link (passwordless):** user enters an email address; Firebase sends a one-time sign-in link. Completing the link verifies control of that email address and signs the user in. Configure Firebase Email Link sign-in; the Firebase console requires the Email/Password provider switch as a prerequisite, but Veyro must not expose or use password credentials.
2. **Phone number OTP:** user enters a phone number and verifies an SMS code through Firebase Phone Authentication. Configure authorised domains, SMS region policy, abuse controls and test numbers for development. Monitor SMS usage/costs and apply resend cooldowns.
3. **Google Sign-In:** use Firebase's Google provider. On web, configure the authorised domains and OAuth consent/branding settings required by the project.

Do not implement email/password registration, password login, forgot-password or reset-password screens. Do not send a separate email verification flow after email-link sign-in; the email link itself verifies the email. Google provider identity is verified by Firebase.

Link multiple providers to one Firebase UID when a signed-in user adds another method. Handle `account-exists-with-different-credential` and provider-linking conflicts safely; do not silently create duplicate Veyro profiles for the same person. Phone numbers must be stored in E.164 format. Keep Firebase Auth as identity authority; Firestore remains the authority for Veyro role and account state.

### 8.2 Product roles and account state

Firebase Auth establishes identity. Veyro's backend/Firestore establishes:
- Product role: `CUSTOMER`, `DRIVER` or `ADMIN`.
- Driver application status: pending, needs changes, rejected, approved or deactivated.
- Customer/driver suspension status and eligibility.
- Resource ownership and permissions.

Never trust browser-supplied role, customerId, driverId, application status or admin flags. Load authoritative role/account data from the backend-owned profile or trusted claims populated through a controlled process.

### 8.3 Middleware order

For a protected route, use the following conceptual order:

1. Authentication (`authenticate`).
2. Broad role requirement (`requireRole`), where relevant.
3. Request validation.
4. Controller.
5. Service-level ownership, account-state and resource authorisation.
6. Repository operation.

Validation may be placed before authentication for intentionally public routes, but protected business operations must not run before identity and permission checks.

### 8.4 Role and ownership rules

- Customer: own profile, vehicles, bookings, trips, payment records and submitted reports only.
- Driver: own profile/application/documents, eligible offers and trips assigned to that driver only.
- Admin: Release 1 has one lightweight `ADMIN` role. Admin can review driver applications, inspect reports, perform approved safety actions and view required audit information.
- No multi-role Admin permission editor or per-admin permission overrides.
- No self-assignment of `ADMIN`; protect initial Admin bootstrap.
- A shared-trip recipient must be authenticated and present the valid share token. Authentication alone is insufficient.
- A share token alone is insufficient without a Firebase-authenticated session.
- Every resource endpoint must check access to the specific resource, not merely the user's broad role.

---

## 9. Firebase Admin SDK and database security

### 9.1 Central initialisation

Initialise Firebase Admin SDK exactly once in `config/firebase-admin.ts`. Export shared typed handles for:
- Admin app.
- Firestore.
- Realtime Database.
- Firebase Storage bucket.
- Auth ID-token verification and App Check token verification.

Avoid repeated initialisation in controllers or modules. Use the same configuration approach in Express and Cloud Functions, while keeping each runtime's deployment secrets and initialisation isolated.

### 9.1.1 Firebase App Check

- Register the production web app with Firebase App Check and use reCAPTCHA Enterprise as the web attestation provider.
- Initialise App Check early in the frontend before calls to protected Firebase services.
- Monitor App Check metrics first, then enable enforcement for supported services after confirming legitimate clients are sending valid tokens.
- Use App Check with Cloud Firestore, Realtime Database, Cloud Storage for Firebase, Maps JavaScript API and Places API (New) where supported. Firebase Authentication App Check is currently documented as Preview; verify its availability and limitations before relying on enforcement.
- The Express API is a custom HTTP endpoint. The frontend must send a limited-use App Check token in `X-Firebase-AppCheck` for protected custom-backend requests; Express middleware must verify it with Firebase Admin SDK `getAppCheck().verifyToken(token, { consume: true })` and reject missing, invalid or already-consumed tokens. Do not assume that deploying an HTTP `onRequest` function automatically enforces App Check.
- Cloud Functions App Check automatic enforcement is documented for callable functions; for the Express HTTP function, use explicit token verification middleware.
- Use `getLimitedUseToken()` in the web client for the custom API when replay protection is required. Use the App Check debug provider only in local development/CI, keep debug tokens out of production and never commit them.
- App Check complements, but does not replace, Firebase Authentication, role/ownership checks, rate limits, input validation or Maps API key restrictions.

### 9.2 Firestore rules

- Start with deny-by-default rules.
- Permit only explicitly required authenticated reads or narrowly scoped client operations.
- Keep sensitive business writes behind Express/Admin SDK.
- Never allow a user to change their own product role, approval status, payment state, booking assignment or Admin audit history.
- Test rules using the Firebase Emulator Suite before deployment.
- Treat Admin SDK operations as privileged: Firestore rules do not protect them.

### 9.2.1 Cloud Storage for Firebase rules

- Keep Storage Rules deny-by-default.
- Store profile images and driver verification documents under separate UID-scoped paths.
- Permit an authenticated user to upload only to their own permitted path, with explicit file-size and content-type constraints.
- Do not allow public reads of driver identity/licence documents.
- Admin document review/download must be performed through an authorised backend path using the Admin SDK; check the Admin role and application ownership before reading.
- Firestore stores metadata and storage paths only. Never store permanent public document URLs.
- Test Storage Rules with the Firebase Emulator Suite, including cross-user upload/read attempts and oversized or disallowed file types.

### 9.3 RTDB rules

- Deny public access.
- Permit only the minimum reads required for a signed-in, authorised user to subscribe to a specific active trip location/presence path.
- Do not permit arbitrary client writes to driver location or presence paths.
- Driver location writes go through the authenticated Express endpoint, which verifies assignment and validates the sample before using Admin SDK.
- Ensure access is removed when the trip ends, is cancelled or the share permission is revoked.
- Test rules against unauthorised customers, unrelated drivers and signed-out users.

### 9.4 Transactional consistency

Use Firestore transactions/batched writes where required for:
- First valid scheduled booking acceptance wins.
- Instant offer acceptance and assignment conflicts.
- Booking/trip state transitions.
- Start/End OTP one-time consumption and attempt counters.
- Payment state transitions and balance changes.
- Suspension incident counters and audit events.

Do not assume a client-side disabled button prevents duplicate requests. Enforce state transitions and idempotency on the server.

---

## 10. Firebase Cloud Functions

### 10.1 Responsibility

Firebase Cloud Functions (2nd gen) provide the deployment runtime for both the Express HTTPS API and separate scheduled/event-driven background handlers. Express remains the single REST application and owns synchronous business logic.

Use them for:
- The Express REST API as one HTTPS `onRequest` function (2nd gen), preserving the modular-monolith design.
- Scheduled expiry/cleanup tasks.
- Time-triggered processing of bookings and scheduled offers.
- Firestore event-driven notifications or derived operations.
- Cleanup of expired temporary live-state data where required.
- Other clearly defined asynchronous tasks that do not need to block an API response.

### 10.2 Separation from Express

- Keep ordinary client-facing REST endpoints in the single Express application; expose it through the Firebase Cloud Functions HTTPS function.
- Do not duplicate scheduled tasks in another scheduler or queue; use the selected Firebase Cloud Functions runtime.
- Keep business rules in shared domain/service logic where practical, so Express and Functions do not implement different interpretations.
- Use the Admin SDK from Functions with least-privilege service configuration.
- Give each function a narrow purpose and bounded execution.
- Use structured task state and retry-safe operations.

### 10.3 Idempotency and retries

Cloud Functions may retry event-driven work. Every trigger or scheduled task that can be retried must be idempotent:
- Use stable event/document IDs or task keys.
- Record completion/claim state where needed.
- Use transactions or conditional state transitions.
- Prevent duplicate notifications, duplicate payment effects or repeated booking transitions.
- Log failure context without sensitive payloads.
- Define bounded retry/dead-letter/manual recovery behaviour for critical tasks.

### 10.4 Suggested initial function groups

| Function group | Trigger | Example responsibility |
|---|---|---|
| Booking schedule | Scheduled | Expire eligible offers/bookings based on server timestamps and approved policy |
| Scheduled offer lifecycle | Scheduled | Open/close scheduled broadcast windows and reconcile eligible pending offers |
| Firestore event handlers | Firestore create/update | Trigger approved notifications or derived non-authoritative records |
| Temporary data cleanup | Scheduled | Remove expired RTDB presence/location records and expired temporary records |
| Safety automation | Firestore event | Apply verified fifth-incident suspension and create corresponding audit record, using the authoritative incident rules |

Do not move the authoritative booking or payment state machine into ad-hoc trigger chains. Keep state transitions explicit, transactional and testable.

---

## 11. Domain modules and key responsibilities

| Module | Responsibilities |
|---|---|
| Auth | Firebase token verification integration, profile bootstrap and authenticated identity context |
| Customers | Customer profile and customer status |
| Vehicles | Customer-owned vehicle create/update and compatibility attributes |
| Drivers | Driver profile, capabilities, rates, service areas and availability |
| Applications | Private document metadata, application submission and manual Admin review |
| Quotes | Server-side route/fare quote and frozen quote snapshot |
| Bookings | Instant/scheduled booking creation, offer lifecycle, acceptance and cancellation |
| Trips | Arrival, waiting, Start/End OTP, trip state, location updates and completion |
| Payments | Razorpay order creation, signature/webhook verification, deduplication, balance and receipts |
| Reports | Report submission, privacy and Admin resolution |
| Share links | Random token generation, hash storage, expiry, revocation and authenticated read-only access |
| SOS | SOS event recording and explicit demo-mode behaviour |
| Notifications | Notification records and approved delivery integration |
| Admin | Application review, driver/customer safety controls and report actions |
| Audit | Append-only sensitive Admin action history |

### 11.1 Product rules the backend must enforce

The backend implementation must preserve the approved Unified Specification, including:
- Customer owns the vehicle; driver supplies the driving service.
- Manual driver application review.
- Instant offer response period of five minutes.
- Scheduled bookings up to 30 days ahead and the approved scheduled broadcast timing.
- First valid scheduled acceptance wins atomically.
- No silent automatic reassignment after driver cancellation.
- Destination/stops lock after confirmation; pickup change follows the specified pre-trip process.
- Separate Start and End OTPs, hashed, single-use, expiry- and attempt-limited.
- Online payment only; Razorpay Test Mode for the college demo.
- Server-side fare calculation and frozen quote snapshot.
- Hourly pricing as the only active Release 1 booking mode; reject/disable PER_KM until explicitly activated.
- Customer-paid fuel, toll and parking exclusions.
- Report privacy and Admin audit requirements.
- Fifth verified driver no-show and fifth qualifying customer cancellation suspension rules.
- Trip sharing requires authenticated session plus valid share token.
- No public driver-document URLs or raw share tokens.
- No long raw GPS trail by default.

The unified specification remains authoritative for exact business values, state transitions and any still-open policy parameters.

---

## 12. OpenAPI and Swagger

Maintain `openapi.yaml` as the API contract.

Every endpoint must document:
- Method and canonical path.
- Summary and operation ID.
- Authentication requirement.
- Required role(s), where applicable.
- Path/query/body schemas.
- Success response schema and status.
- Known error codes/statuses.
- Pagination and filtering behaviour.
- Idempotency expectations for sensitive mutations.
- Example request and response without real personal data.

Expose Swagger UI only in a controlled development/demo configuration or protect it appropriately. Do not publish secrets or internal infrastructure details in the API specification.

---

## 13. Environment, secrets and deployment

### 13.1 Environment variables and secrets

Maintain `.env.example` with names only. Firebase App Hosting, Cloud Functions and Cloud Storage for Firebase require the Firebase Blaze (pay-as-you-go) plan. Link the intended Google Cloud Billing account only after verifying your $300 credit eligibility, remaining balance, expiration and eligible SKUs. The credit does not make usage unlimited or guarantee that every product/charge is covered. Set budgets, alerts and service-specific spend controls; budget alerts alone do not cap charges. In production, prefer the Cloud Functions runtime service identity (Application Default Credentials) for Firebase Admin SDK access. Do not deploy a long-lived service-account private key as an environment variable. Store Razorpay secrets and any other server-only credentials in Google Cloud Secret Manager and bind them to the relevant function.

```dotenv
# Express API / Cloud Functions
NODE_ENV=
API_BASE_PATH=/api/v1
FRONTEND_ORIGIN=
FIREBASE_PROJECT_ID=
FIREBASE_DATABASE_URL=
FIREBASE_STORAGE_BUCKET=

# Razorpay (local development only; production values in Secret Manager)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Google Maps server-side key (restrict to required APIs; production secret in Secret Manager)
GOOGLE_MAPS_SERVER_KEY=

# Web / Firebase client configuration (public client configuration)
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=
NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

Firebase web configuration values and Maps browser key are not server secrets, but Maps keys must be restricted by HTTP referrer and API. Never commit `.env`, service-account JSON, private keys, Razorpay secrets, Secret Manager values, App Check debug tokens or unrestricted API keys.

### 13.2 Firebase App Hosting — Next.js frontend

- Deploy the Next.js App Router PWA through Firebase App Hosting with a connected GitHub repository and a dedicated production branch.
- Use the officially supported Next.js integration and a supported Node.js runtime version.
- Configure the production domain, HTTPS, authorized Firebase Authentication domains and App Hosting environment variables/secrets.
- Set `NEXT_PUBLIC_API_BASE_URL` to the Firebase Cloud Functions HTTPS API origin plus `/api/v1`.
- Configure the browser Maps key with HTTP-referrer and API restrictions. Enable only the required Maps JavaScript API, Places API (New), Routes API and Geocoding API; apply App Check to supported Maps services and key restrictions to every enabled API.
- For Firebase Cloud Messaging web push, configure the web push certificate/VAPID key, register a messaging service worker, request notification permission contextually and store the FCM registration token against the authenticated user with revocation/refresh handling.
- **Regional constraint for India:** the current published Firebase App Hosting regions include `asia-southeast1` (Singapore) and `asia-east1` (Taiwan); no India App Hosting region is listed. Singapore is the initial nearest-available Asia recommendation for an India-focused launch, subject to rechecking the live region list at setup.
- Verify App Hosting region availability, runtime support, build limits, caching behaviour and costs before selecting the production region. App Hosting's primary region serves uncached content; its CDN does not make the server-rendered origin region-neutral.
- Keep server-only credentials in Secret Manager/App Hosting secret configuration; never expose them through `NEXT_PUBLIC_` variables.

### 13.3 Firebase Cloud Functions — Express API and background work

- Deploy the existing single Express modular-monolith application as one HTTPS function using Firebase Cloud Functions (2nd gen) and the supported `onRequest` HTTP handler. Keep the canonical API prefix `/api/v1/`.
- Keep scheduled and event-triggered jobs as separate, narrowly scoped Cloud Functions in the same Firebase functions codebase. Do not create a second general-purpose API or split domain modules into microservices.
- **Regional placement is a pre-provisioning decision:** the current Cloud Functions location guide maps Firestore/Storage in `asia-south1` (Mumbai) to `asia-east2` (Hong Kong) as the nearest supported Functions region. If Firestore/Storage are placed in Mumbai, benchmark the resulting API/data cross-region latency and transfer costs; do not assume a Mumbai Functions region is available. App Hosting in Singapore and Functions in Hong Kong are a plausible India-first pairing, but confirm live region support and benchmark before approval.
- App Hosting manages its underlying Cloud Build, Artifact Registry, Cloud Run and Cloud CDN resources; do not create duplicate manually managed hosting stacks for Release 1.
- Configure runtime service identity with least privilege, Secret Manager bindings for Razorpay and other server secrets, memory/timeout/concurrency and minimum instances only when justified by measured needs.
- Provide a lightweight health endpoint that does not leak configuration.
- Configure CORS for the exact App Hosting production domain and explicitly approved local development origins.
- Verify HTTPS function limits, cold-start behaviour, request timeout, concurrency and cost with realistic API tests. If the API outgrows the function execution model, revisit hosting through a new explicit decision rather than silently adding a separate Cloud Run service or another hosting provider.

### 13.4 CORS and transport


- Allow only known Veyro frontend origins.
- Do not use wildcard origins with credentials.
- Require HTTPS in deployed environments.
- Do not treat CORS as authentication or authorisation.

---

## 14. Testing and release acceptance

### 14.1 Selected strategy

Use Jest and Supertest for essential automated tests. Prioritise correctness of domain rules, security boundaries, race-sensitive operations, Firebase Cloud Function idempotency and payment handling. Use a documented manual end-to-end checklist for the complete customer/driver/Admin journey; a large automated browser E2E suite is not required for Release 1.

### 14.2 Automated test layers

**Unit/service tests**
- Driver eligibility and availability.
- Fare quote and final fare calculations.
- Waiting, cancellation and no-show calculations.
- Booking and trip state transition rules.
- OTP hashing, expiry, attempt limits and one-time consumption.
- Share-token hashing, expiry and revocation.
- Payment state transitions and idempotency helpers.
- Suspension incident counting.
- Cloud Function task handlers, retry-safe behaviour and idempotency keys.

**HTTP integration tests**
- Firebase Auth email-link/phone/Google identity flows, ID-token middleware and provider-linking conflict handling.
- App Check middleware, including missing, invalid, expired and replayed limited-use token cases.
- Firebase Storage Rules for profile-image and driver-document paths; cross-user read/write denial.
- FCM token registration, invalid-token cleanup and notification fallback when browser permission is denied.
- Role and resource ownership middleware/service checks.
- express-validator error responses.
- Firestore repository behaviour and transactions using emulator/test doubles.
- RTDB write authorisation path.
- Firebase Storage Security Rules, upload validation and privileged Admin document access.
- Razorpay signature and webhook verification.
- Duplicate webhook/event handling.
- Cloud Function scheduled/event-trigger handler integration and duplicate-trigger protection using the Firebase Emulator Suite or controlled test doubles.
- OpenAPI route/contract smoke checks where practical.

### 14.3 Manual release journey

Run and record these scenarios before demo/release:
1. Customer passwordless email-link sign-in, phone OTP sign-in, Google Sign-In and provider linking.
2. Driver passwordless sign-in using email link/phone OTP/Google, onboarding, private Firebase Storage document upload and pending status.
3. Admin manual approve/reject/request-changes and audit record.
4. Driver online eligibility and location permission.
5. Instant booking, offer expiry and acceptance.
6. Scheduled booking broadcast and first-acceptance-wins.
7. Pickup arrival, waiting, Start OTP, End OTP and trip completion.
8. Live location, stale GPS state, trip-share login/token validation and revocation.
9. Razorpay test order, success, failure, retry, webhook verification and duplicate callback.
10. Outstanding balance gate.
11. Customer/driver report privacy and Admin resolution.
12. Fifth qualifying incident automation and audited restoration.
13. Cross-user access attempts and unauthorised Admin access.
14. Responsive PWA behaviour and essential accessibility checks.

Use seeded demo accounts and synthetic/redacted documents. Do not use real customer identity documents or live payment credentials for the college demo.

### 14.4 Test tools and commands

The team may use Postman for manual API exploration, but saved Postman collections do not replace automated tests. Keep test fixtures and emulator setup reproducible.

Suggested scripts (adapt to the actual package manager):
```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

Do not claim the backend is release-ready merely because the server starts. All critical business, access-control and payment tests must pass, and the manual journey checklist must be recorded.

---

## 15. Consistency review against Unified Specification v3.6

The companion Unified Specification v3.6 includes an explicit register of all 14 approved backend architecture decisions and the matching implementation prompts. The matrix below records the result of the cross-document review.

### 15.1 Backend decision alignment matrix

| Backend decision | Companion specification alignment | Review |
|---|---|---|
| 1. Modular monolith | One Express API owns authoritative business logic | Aligned |
| 2. Strict layered structure | Express API is organised into modules; this document defines routes/controllers/services/repositories/models/validators | Aligned; detailed folder boundaries live here |
| 3. URL-based API versioning | Architecture table, API prompt and API contract outline use `/api/v1/` | Aligned |
| 4. express-validator | Backend prompt selects express-validator; shared contracts are TypeScript DTOs/types, not a competing Zod request-validation layer | Aligned |
| 5. Swagger/OpenAPI | API contract requires OpenAPI/Swagger documentation | Aligned |
| 6. Standard JSON response | No conflicting response envelope is defined in the product specification | Aligned; this document supplies the envelope |
| 7. Central global error middleware | No competing error-handling architecture is specified | Aligned; implementation detail is defined here |
| 8. Basic console logging + Google Cloud Logging | Console output is captured by Firebase/Google Cloud runtimes; no third-party logging platform is required | Aligned |
| 9. dotenv + central config + Google Cloud runtime configuration | Environment variables and Secret Manager handling are specified | Aligned |
| 10. Central Firebase Admin SDK | Firebase Auth, Firestore, RTDB and Storage use the shared Admin SDK where privileged server access is required | Aligned |
| 11. Firebase token verification + role middleware | Firebase owns identity; backend owns product roles, account state and resource permissions | Aligned |
| 12. Strict Firebase rules + backend validation | Deny-by-default Firestore/RTDB rules and server-side authorisation are required | Aligned |
| 13. Firebase Cloud Functions | Cloud Functions host the Express HTTPS API and the separate scheduled/event-driven functions | Aligned |
| 14. Essential automated testing | Jest/Supertest cover critical unit/service and HTTP integration tests; full journey E2E is a documented manual checklist | Aligned |

### 15.2 Cross-document implementation clarifications

**API prefix**
- `/api/v1/` is the only canonical API prefix.
- The architecture table, backend prompt, Admin restore endpoint and API contract outline in Unified Specification v3.6 use this prefix.
- Do not expose or maintain a parallel `/v1/` route namespace.

**Request validation**
- `express-validator` is the selected Express request-validation library.
- Shared TypeScript DTOs/API types may live in `packages/contracts`; they are not a second request-validation framework.
- Do not use Zod as a competing request validator in Release 1.

**RTDB client subscriptions**
- The frontend may subscribe only to the minimum active-trip location path for a specific trip when the signed-in user is authorised to view it.
- Keep location writes behind authenticated Express endpoints.
- Firestore remains authoritative for trip status and viewer entitlement. If Firebase rules cannot safely express the access condition, use an authenticated server-mediated read.

**Background work**
- Firebase Cloud Functions are the selected runtime for the Express HTTPS API and all scheduled/event-driven work in Release 1.
- Keep ordinary client-facing REST endpoints in the single Express app deployed as a Firebase Cloud Functions (2nd gen) HTTPS `onRequest` function.
- Do not duplicate scheduled tasks with `node-cron` or a second queue.
- Function retries must be idempotent and must not create duplicate notifications or state transitions.

**Testing depth**
- Automate critical business logic, security boundaries, API behaviour and payment workflows with Jest/Supertest.
- Use manual end-to-end walkthroughs for complete customer, driver and Admin journeys.
- This is an intentionally essential testing scope for the five-person team, not permission to omit critical security/payment tests.

### 15.3 No architecture drift

Do not reintroduce any of the following while implementing the approved decisions:
- MongoDB Atlas or another primary database.
- Cloudflare products or another third-party infrastructure provider.
- Custom JWT authentication alongside Firebase Auth.
- Socket.IO or a separate custom WebSocket service.
- Redis/BullMQ as a queue.
- Microservices for each domain module.
- Public Storage buckets or permanent public driver-document URLs.
- Client-controlled booking/payment/role state.
- Browser-direct writes to privileged RTDB paths.

---

## 16. Implementation sequence for the five-person team

1. **Foundation:** repository setup, TypeScript, Express app, central config, Firebase Admin initialisation, health route, CORS and global error middleware.
2. **API standards:** `/api/v1/` routing, response helpers, express-validator middleware, OpenAPI/Swagger and shared error codes.
3. **Identity and access:** Firebase ID token verification, backend profile/role lookup, role middleware, resource ownership helpers and Firebase rules.
4. **Core data modules:** customer, vehicle, driver, application and private Firebase Storage document workflows.
5. **Booking core:** quote, booking state machine, offer expiry, atomic acceptance, cancellation and scheduled booking lifecycle.
6. **Trip core:** arrival, waiting, Start/End OTP, active-trip location and trip sharing.
7. **Payments and safety:** Razorpay test flow, webhook idempotency, reports, SOS demo behaviour, incident suspension and Admin audit.
8. **Background functions:** scheduled lifecycle tasks, event-triggered notifications and temporary data cleanup.
9. **Testing and deployment:** Jest/Supertest, emulator rules tests, manual release journey, Firebase App Hosting + Cloud Functions deployment configuration and demo rehearsal.

Build vertical slices that can be tested end to end. Do not build all controllers first and postpone business rules, security and tests until the end.

---

## 17. Final architecture lock

The Release 1 backend is:

**Next.js PWA on Firebase App Hosting → Node.js + Express.js + TypeScript modular monolith (`/api/v1/`) deployed as a Firebase Cloud Functions (2nd gen) HTTPS function → Firebase Admin SDK → Cloud Firestore + Firebase Realtime Database + Cloud Storage for Firebase**, with **Firebase Cloud Functions** for scheduled/event-driven work, **Firebase Authentication** for passwordless email-link, phone OTP and Google Sign-In, **Firebase App Check** for abuse protection, **Razorpay Test Mode** for payments and **Google Maps Platform** for maps/routes.

The approved implementation conventions are:
- Strict layered module structure.
- express-validator request validation.
- Swagger/OpenAPI documentation.
- Standard JSON success/error envelopes.
- Central global error middleware.
- Basic console logging captured by Google Cloud Logging.
- Central environment/configuration module.
- Firebase ID token verification and role middleware.
- Strict Firestore/RTDB/Storage rules plus server-side authorisation and App Check verification.
- Jest/Supertest essential automated tests plus a manual end-to-end release checklist.

**Architecture decisions 1–14 are recorded as complete and synchronised with Unified Specification v3.6.** No known cross-document conflicts remain in the approved backend architecture. Treat these two documents as a paired implementation baseline; if either changes, update the other and the API contract/tests in the same change.
