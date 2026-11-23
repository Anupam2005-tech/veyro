# Veyro API contract

The [OpenAPI contract](../apps/api/docs/openapi.yaml) describes the running API. For local development, set `ENABLE_API_DOCS=true` in `apps/api/.env`, restart the API, and open [Swagger UI](http://localhost:4000/api/v1/docs/). Adjust the port if needed. The UI serves its assets locally. Production disables the UI and its YAML endpoint.

Use **Try it out** on `GET /api/v1/health` to check the running process. The response includes the request ID and a UTC timestamp.

## Session bootstrap

Call `POST /api/v1/auth/session` with the signed-in user's Firebase bearer ID token and a fresh limited-use token in `X-Firebase-AppCheck` on each attempt. Supply `roleIntent` as `customer`, `driver` or null. New profiles default to Customer. Existing profiles can select an already-held role. Registration cannot grant Admin. The frontend client needs to obtain the limited-use token before calling the protected endpoint.

## Planned domain paths

The [readiness design](../openspec/changes/reconcile-project-readiness/design.md) identifies these nine paths. Their owners will add operations, schemas and authorization requirements to OpenAPI as each endpoint is implemented and reviewed.

| Feature | Reserved path |
|---|---|
| Customer vehicles | `/api/v1/vehicles` |
| Driver application | `/api/v1/driver-applications/me` |
| Booking quote | `/api/v1/bookings/quotes` |
| Accept driver offer | `/api/v1/driver-offers/{offerId}/accept` |
| Trip arrival | `/api/v1/trips/{tripId}/arrival` |
| Trip start | `/api/v1/trips/{tripId}/start` |
| Trip completion | `/api/v1/trips/{tripId}/complete` |
| Razorpay webhook | `/api/v1/payments/webhooks/razorpay` |
| Admin application decision | `/api/v1/admin/driver-applications/{applicationId}/decision` |

## Payments and safety integration

| Operation | Server contract |
|---|---|
| Payment order | POST /api/v1/payments/orders with invoiceId and Idempotency-Key. The stored payable supplies amountPaise and INR currency. Each invoice reuses its Test Mode order across retries and browsers. |
| Payment status | POST /api/v1/payments/status with invoiceId. Returns READY, PENDING, FAILED, CAPTURED, DISPUTED or REVIEW_REQUIRED. A provider-confirmed capture can settle the invoice even if the browser callback and webhook were missed. |
| Order recovery | POST /api/v1/payments/reconcile with invoiceId and Idempotency-Key. Looks up the active attempt's Razorpay receipt. If the create lease expired and no order was found, retries creation with the original receipt. |
| Checkout verification | POST /api/v1/payments/verify with the stored attemptId and Razorpay callback fields. A valid callback signature still requires server-side capture confirmation. |
| Webhook | POST /api/v1/payments/webhooks/razorpay with provider signature and event ID. The original bytes are verified before JSON parsing. Captured and failed facts are fetched from Razorpay. |
| Reports | POST /api/v1/reports with tripId, category, description and Idempotency-Key. Categories come from the approved safetyPolicies/reports document. Only the reporter can read /reports/{id}; Admin routes are separately authorized. |
| Demo SOS | POST /api/v1/sos with tripId and Idempotency-Key. The caller must belong to an active trip. Cancel at /sos/{id}/cancel. Delivery is SIMULATED. |
| Notifications | GET /api/v1/notifications?role=DRIVER (or CUSTOMER or ADMIN), POST /notifications/{id}/read with role, and device registration/removal under /notifications/device. Each operation checks the signed-in account and workspace. |

### Transactional email

- Account creation and fresh Firebase sign-ins, finished customer setup, contact changes, driver application submissions and review decisions, key booking/trip changes, and captured payments queue email alongside the in-app notification. Sign-in alerts deduplicate on Firebase's sign-in timestamp. Contact update alerts are limited to once per UTC day per account.
- Firebase Auth sends password registration verification and sign-in links. Resend sends transactional updates only to the current verified Firebase address. Booking and trip email honor the saved notification preferences. The email job is server-only, and messages contain no trip locations, document links, payment identifiers or verification codes.
- Bind `RESEND_API_KEY` from Secret Manager to the two email Functions. Set `RESEND_FROM_EMAIL` as a runtime environment variable on the deployed Functions using a Resend-verified sending domain. The scheduled worker retries due jobs with backoff within Resend's 24-hour idempotency window. Provider acceptance is recorded separately from inbox and push status. Validate delivery on staging with approved test recipients.
- Driver onboarding shows Places suggestions and saves up to ten distinct place IDs. Admin review links to each selected area in Google Maps. Older profiles may continue to send descriptive service-area text. The reviewed pickup pin and radius continue to determine dispatch coverage. [Google Maps content and attribution guidance](https://developers.google.com/maps/documentation/places/web-service/policies)
- Device push enrollment binds one browser token to one verified account and workspace. When the browser switches accounts or workspaces and enrolls again, only the new binding receives pushes. Existing devices must re-enable push once after rollout to create the scoped binding. The in-app inbox works independently.
- Driver profile changes are saved to Firestore. A rate-only edit preserves approval and applies to future bookings. An approved driver remains discoverable with fresh foreground presence across driver screens. Eligibility still applies pickup coverage, vehicle compatibility, radius and reservations.
- `POST /api/v1/drivers/me/deletion-request` records the signed-in driver's request for retention-policy review.

Production protected operations require bearer authentication and a fresh limited-use App Check token. Webhooks use provider authentication.

### Upstream records and operational dependencies

- Trip completion and approved cancellations/no-shows produce confirmed payables with customerId, integer amountPaise, currency INR, status CONFIRMED and isUnderActiveDispute. Payment and booking balance checks read these records.
- The booking balance check runs inside the booking creation transaction. Financial writers must share its customer serialization document and publish payables in the same transaction as charge facts.
- Order creation reserves one provider receipt per invoice. Failed payment attempts retain the order because Razorpay may later authorize them. Checkout rechecks provider state before reopening and captured invoices reject another order. Conflicting historical orders or changed amounts require review.
- The trip producer must supply trips/{id} with customerId, driverId and authoritative status. Demo SOS location enrichment awaits the agreed GPS interface.
- The incident producer creates immutable verifiedIncidents with uid, kind CUSTOMER_CANCELLATION or DRIVER_NO_SHOW, verified true and qualifies true after approved evidence/exclusions. The processor counts once and suspends at five. It uses the current specification's durable lifetime counters. Rolling-window policy reconciliation remains pending.
- Inbox creation is atomic with report resolution and suspension. The Functions worker and retry schedule deliver generic pushes identifying the inbox item. Pushes can repeat after an ambiguous send, while inbox records remain unique. Failed sends retry at most ten times; the inbox remains readable.
- Configure RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET through the environment/Secret Manager workflow. Enable automatic capture in Razorpay Test Mode and point its webhook to `/api/v1/payments/webhooks/razorpay` on the staging API for `payment.authorized`, `payment.captured`, `payment.failed` and `order.paid`. Confirm a sandbox payment and webhook delivery against that staging API before sign-off.
- Functions and the notification collection-group index must be deployed before background delivery works. Deployable workspace dependency packaging and actual provider/FCM tests remain release checks.

## Backend completion contracts — updated 23 November 2026

| Producer | Backend record / responsibility | Integration status |
|---|---|---|
| Team 1 vehicle/profile services | users/{uid}, drivers/{uid}, vehicles/{id}. Vehicle customerId establishes ownership; driver approvalStatus and hourlyRateInr remain server-owned | Implemented producer; frontend canonical DTO integration remains |
| Team 3 route service | routeQuotes/{id} with verified, customerId, vehicleId, distanceKm, durationMinutes and expiresAt (milliseconds). Radius defaults to 15km; larger searchRadiusKm requires customerExpandedRadius true | Producer and booking adapter implemented; live provider/configuration verification remains |
| Team 3 availability | driverAvailability/{uid} with online and updatedAt (milliseconds); driverEligibility/{uid}/vehicles/{id} with eligible, routeId, vehicleCategory, transmission, expiresAt, pickupDistanceKm and pickupEtaMinutes | Producer and booking adapter implemented; live provider/configuration verification remains |
| Team 3 GPS verification | arrivalEvidence/{tripId} with driverId, verified, withinPickup100m, accuracyAccepted and observedAt (milliseconds) | GPS producer implemented; driver arrival fails closed without fresh evidence; customer confirmation fallback remains |
| Verified no-show processor | driverNoShowEvidence/{tripId} with verified, driverId, customerReportId and optional approved qualifies | Qualification/exclusion policy remains pending |
| Trip completion | Creates payables/{tripId}, driverEarnings/{tripId} and releases its reservation atomically | Implemented and emulator-tested |
| Cancellation | Uses the frozen DEC-05 version and creates cancel-{bookingId} payable for an applicable charge | Implemented; no automatic qualifying incident from a selected reason |
| Payments | Verified capture writes immutable ledger entry, unique receipt and marks accrued completed-trip earnings paid | Implemented; real capture/webhook verification remains pending |

### Approved initial policy categories

The project owner approved these lists on 22 November. The source defaults live in apps/api/src/config/approved-policies.ts. Existing backend-owned policy documents can explicitly configure lists. Unapproved fee schedules remain rejected.

| Use | Codes |
|---|---|
| Reports | SAFETY_CONCERN, DRIVER_CONDUCT, CUSTOMER_CONDUCT, SERVICE_ISSUE, FARE_OR_PAYMENT, LOST_ITEM, OTHER |
| Customer cancellation | PLANS_CHANGED, PICKUP_OR_TIME_ISSUE, DRIVER_DELAYED, DRIVER_NO_SHOW, TECHNICAL_ISSUE, OTHER |
| Driver cancellation | UNAVAILABLE, VEHICLE_INCOMPATIBLE, PICKUP_ACCESS_ISSUE, SAFETY_CONCERN, TECHNICAL_ISSUE, OTHER |

Reason selection alone does not grant a fee exemption or qualify an incident. Lifetime counters continue under the current specification; qualification/exclusions and no-trip dispute timing remain pending.

### Trip verification and financial controls

- Trip records initialize from an assigned booking. Customer-confirmed arrival is independently authorized. Driver arrival requires a recent server-only GPS verdict.
- OTP issuance is currently an internal service. Secure customer display/delivery and recovery were explicitly left pending by the owner. Codes use separate phases, salted HMAC hashes, a five-minute expiry, five total failed attempts and a 60-second regeneration cooldown. Locked verification needs an approved recovery flow. The assigned driver consumes the code through start/complete.
- TRIP_OTP_SECRET is a private local environment value for development and must be bound through Secret Manager for deployment. The local secret was generated without printing its value.
- Completion freezes the final rounded INR fare and waiting fee in a payable. Customer no-show replaces waiting fees with INR 150. Cancellation/no-show driver allocations remain ALLOCATION_PENDING until approved.
- Completed-trip disputes use Pritam's existing 48-hour rule. An owned report is required. No-trip dispute requests fail with DISPUTE_POLICY_PENDING.
- Adjustments require an active Admin, a reason and an idempotency key. They can correct unpaid invoices before an active provider order exists. Captured-payment corrections require the separate provider-refund/settlement workflow.
- ADMIN_GRANTER_UID must be the project lead's real Firebase UID. It remains unset at the owner's request. Existing active Admin authorization is also required. Firebase provider linking/conflict recovery completes in the signed-in client credential flow; the backend verifies the current UID's linked provider state and never merges profiles based on email alone.

### Functions packaging

Run `node scripts/package-functions.cjs` before starting the Functions emulator or deployment workflow. The script builds API/Functions and generates .firebase/functions-package with compiled code, docs and exact installed runtime dependency versions. Firebase predeploy regenerates this source. Environment files are excluded. Node 22 is the declared deployment runtime. The generated package was independently installed and loaded under Node 22. Actual deployment, runtime IAM, Secret Manager and external provider delivery remain release checks.

Expiry and broadcast workers run each minute and process due records. Notification delivery still uses its existing durable inbox and bounded retries. New required composite indexes are declared in infra/firebase/firestore.indexes.json.

The working tree also contains a non-production App Check bypass for missing tokens. Production enforcement is verified explicitly by the identity tests. Embedded Express ignores the host-owned PORT value; standalone server startup retains numeric port validation.

## Core records and mobility — 23 November 2026

The remaining producer APIs now exist. The web client must use the backend IDs and request shapes documented in OpenAPI. Existing live-to-demo fallback behavior in frontend adapters still requires its own integration review.

| Area | Entry points and rules |
|---|---|
| Customer | GET /customers/me and POST /customers/onboarding. Consent is required. Contact edits preserve server roles and account status. Deletion requests enter policy review while physical erasure remains dependent on retention rules. |
| Vehicles | GET/POST /vehicles, POST/DELETE /vehicles/{id}. New IDs are server-generated. Foreign and actively reserved vehicles cannot be overwritten. |
| Drivers | GET /drivers lists approved online candidates without coordinates or phone numbers. Final eligibility remains a separate check. GET/POST /drivers/profile handles owner fields and hourly rates. PER_KM remains stored and disabled. |
| Applications | POST/GET /driver-applications/me is canonical. Existing /drivers/applications compatibility paths use the same verified-upload service. Approved applications cannot be reset through resubmission. |
| Documents | POST /driver-applications/documents?kind=LICENCE, GOVERNMENT_ID or PROFILE_PHOTO accepts private binary uploads. Return IDs are the only accepted submission references. Admin download streams the recorded immutable generation as an attachment. |
| Presence | GET/POST /availability uses an online flag and foreground position. An active approved Driver is required to go online. Stale presence is excluded from discovery. |
| Road route | POST /mobility/routes with vehicleId, points, optional radiusKm/expanded and optional scheduled pickupAt. Server Routes API supplies distance/time. Radius starts at 15km and larger radii require explicit expansion. |
| Eligibility | POST /mobility/eligibility with routeId and driverId validates profile, vehicle compatibility, service-area bounds, road pickup distance and reservations. Precise unrelated driver coordinates are never returned. |
| GPS | POST/GET /locations/{tripId}. Writes require assigned Driver and an eligible trip stage. Duplicate identical relay retries are accepted; stale, out-of-order and implausible jumps are rejected. |
| Share | POST /shares returns token once and its hash ID. GET /shares/view uses bearer authentication and X-Trip-Share; it returns approximate coordinates/status only. POST /shares/{hash}/revoke is owner-only. |

### Implementation choices requiring integration verification

- The directory uses service categories STANDARD, PREMIUM and LUXURY, and MANUAL/AUTOMATIC transmissions. Physical body styles are not automatically mapped into these categories.
- Service coverage is represented by driver-supplied rectangular serviceAreaBounds, reviewed with the application. Changing identity, capabilities or coverage disables eligibility until manual review. The frontend needs a suitable coverage input.
- The route adapter uses GOOGLE_MAPS_SERVER_KEY and Google Routes computeRoutes with a field mask for distanceMeters and duration. There is no straight-line billable fallback. [Google Routes reference](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes).
- Route creation uses a five-minute quote freshness window. Stored scheduled bookings can refresh short-lived pickup eligibility after that window; their frozen route/rate facts remain authoritative. Changing the pickup requires a new quote. A scheduled trip still en route, arrived or in progress blocks immediate instant assignment even after its estimated reservation end.
- Upload size is interpreted as exactly 10,000,000 bytes. Content checks inspect size, MIME and file signatures; identity/document authenticity remains a manual review responsibility. Uploads are immutable and private.
- GPS freshness is 30 seconds. A pickup verdict requires the measured pickup distance plus reported uncertainty to fit within 100m. Jump screening uses a conservative 100m/s plausibility ceiling with accuracy allowances. Real-device calibration remains pending.
- Only the latest trip point is stored. Completion/cancellation removes Firestore samples and evidence, and RTDB cleanup writes a disabled fence against delayed relays. Stale location/presence cleanup runs every 15 minutes with a 24-hour maximum fallback.
- RTDB client access remains denied. Authenticated API reads authorize participants or valid share recipients. This avoids public location subscriptions.
- Cloud Storage, RTDB and Google Routes configuration must be supplied for live integration. Emulator tests use synthetic data and a deterministic road provider.

## Frontend integration contract — 23 November 2026

| Area | Current implemented contract |
|---|---|
| Mode selection | Demo requires NEXT_PUBLIC_VEYRO_DEMO_MODE=true. Live auth/profile/booking failures are shown; they never create demo records. |
| Auth and App Check | Every protected browser request sends a bearer token and a newly minted limited-use App Check token. Missing live API/App Check setup is surfaced. Sign-in never restores suspended accounts or changes server roles. |
| Screen reads | /views/bookings, /views/trips/{id}, /views/driver-profile, /views/offers and /views/earnings are participant/role-scoped read models. /views/admin/* requires active Admin. Views exclude OTP vaults and unrelated private uploads/contact details. |
| Profiles | PATCH /customers/me validates allowed contact/preferences fields and atomically applies the full owned vehicle list. Foreign IDs and reserved mutations are rejected; new IDs are server-generated. Favourites and completed-trip ratings have authenticated persistence. |
| Photos and documents | Driver verification uploads use server IDs. Customer account photos use private immutable uploads and authenticated own-photo downloads. Admin verification previews/downloads use the recorded immutable generation; no public URL is created. |
| Road previews | The browser uses the authenticated route producer. Server Routes API returns distance/time and GeoJSON road geometry. Missing geometry produces no invented straight-line road path. Historical quotes may have no path. |
| Places | The browser uses AutocompleteSuggestion and Place.fetchFields. A session token spans typing and selection; details are fetched only for the selected prediction. The legacy browser Directions path is no longer used for live previews. |
| Matching | Driver search combines approved directory results with server road eligibility. Radius expansion is explicit. Scheduled creation uses a rate cap without a selected driver; current online counts do not promise future availability. |
| Booking and trips | Confirmation sends only quoteId and a millisecond pickupAt. Stale/changed UI quotes are cleared. Assigned-offer retries initialize one trip idempotently. Arrival, start, completion and no-show use canonical server actions. |
| Realtime | Visible trip/share/offer screens poll; foreground driver GPS is relayed every 10 seconds and presence is renewed every 15 seconds. Tracking stops on teardown, hidden pages or terminal state. Google marker updates preserve the map instance. |
| Sharing | The API token is carried in X-Trip-Share. UI links remain authenticated bearer-capability URLs with no-referrer/noindex metadata. Replacement revokes previous links, privacy opt-out revokes links, and termination denies reads. No raw token is recovered after reload. |
| Payments | Checkout is Test Mode only. Order amount/key come from the backend. Signature and capture are verified server-side; callback success alone does not mark payment captured. Uncertain orders reconcile with the same request identity. |
| Audit and reports | Initial approved categories are used. Admin decisions/restores and reporter submissions reuse idempotency identity after uncertain failures. Report review and resolution each write one audit/inbox event. |
| Preferences and inbox | All shells expose own inbox/read controls. Optional booking/trip/service/SOS push preferences are applied while durable inbox records remain. Security/account decisions remain in-app. Optional analytics and personalisation are inactive in R1. |
| Database selection | API and background Functions use the same FIRESTORE_DATABASE_ID selector. Firestore event triggers specify that database. Emulator fixtures explicitly select (default). Live rules/index deployment must target the configured named database. |

The local preview build uses VEYRO_NEXT_DIST_DIR=.next-review so verification does not overwrite an existing development server's chunks. It is excluded from Git. No environment files are modified by the preview workflow.

The Google field mask and Places migration follow the [Routes reference](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes) and [Places Autocomplete Data guide](https://developers.google.com/maps/documentation/javascript/place-autocomplete-data). Checkout follows the [Razorpay integration guide](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/build-integration/). These services still require configured live keys, restrictions, quotas and integration checks.

Manual go-offline requests are rejected while a driver has an IN_PROGRESS trip. The UI disables that toggle, and the backend enforces the same rule. Driver navigation does not invent turn-by-turn instructions when the provider supplies none.

### Browser push

NEXT_PUBLIC_FIREBASE_VAPID_KEY is the Firebase project's public Web Push certificate key. The inbox offers explicit Enable/Disable controls. Permission/configuration/support failures retain the in-app inbox. Firebase Messaging is deferred until needed; tokens are registered through /notifications/device and removed on disable/sign-out when available. The existing /sw.js registration handles generic updates without putting private push payload fields into notices or caches. Actual delivery remains a test-device release check. See [Firebase getToken options](https://firebase.google.com/docs/reference/js/messaging.gettokenoptions).
