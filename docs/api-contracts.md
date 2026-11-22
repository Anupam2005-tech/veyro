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
| Payment order | POST /api/v1/payments/orders with invoiceId and Idempotency-Key. The stored payable supplies amountPaise and INR currency. Only Test Mode keys are accepted. |
| Checkout verification | POST /api/v1/payments/verify with the stored attemptId and Razorpay callback fields. A valid callback signature still requires server-side capture confirmation. |
| Webhook | POST /api/v1/payments/webhooks/razorpay with provider signature and event ID. The original bytes are verified before JSON parsing. Captured and failed facts are fetched from Razorpay. |
| Reports | POST /api/v1/reports with tripId, category, description and Idempotency-Key. Categories come from the approved safetyPolicies/reports document. Only the reporter can read /reports/{id}; Admin routes are separately authorized. |
| Demo SOS | POST /api/v1/sos with tripId and Idempotency-Key. The caller must belong to an active trip. Cancel at /sos/{id}/cancel. Delivery is SIMULATED. |
| Notifications | GET /api/v1/notifications, POST /notifications/{id}/read, and device registration/removal under /notifications/device. Each call is scoped to the verified user. |

Protected operations require bearer authentication and a fresh limited-use App Check token. Webhooks use provider authentication.

### Upstream records and operational dependencies

- The completed-trip/ledger producer must create immutable confirmed payables with customerId, integer amountPaise, currency INR, status CONFIRMED and isUnderActiveDispute. This release reads them for payment and booking balance enforcement. Real completed-trip/charge integration remains pending.
- The booking balance check runs inside the booking creation transaction. Financial writers must share its customer serialization document and publish payables in the same transaction as charge facts.
- Order creation claims one active attempt per invoice before calling Razorpay. A provider timeout or crash after that claim remains blocked for reconciliation. Failed payments verified through the provider permit a new idempotency key. Captured invoices reject another order.
- The trip producer must supply trips/{id} with customerId, driverId and authoritative status. Demo SOS location enrichment awaits the agreed GPS interface.
- The incident producer creates immutable verifiedIncidents with uid, kind CUSTOMER_CANCELLATION or DRIVER_NO_SHOW, verified true and qualifies true after approved evidence/exclusions. The processor counts once and suspends at five. It uses the current specification's durable lifetime counters. Rolling-window policy reconciliation remains pending.
- Inbox creation is atomic with report resolution and suspension. The Functions worker and retry schedule deliver generic pushes identifying the inbox item. Pushes can repeat after an ambiguous send, while inbox records remain unique. Failed sends retry at most ten times; the inbox remains readable.
- Configure RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET through the existing environment/Secret Manager workflow. No live provider call or resource deployment is part of local verification.
- Functions and the notification collection-group index must be deployed before background delivery works. Deployable workspace dependency packaging and actual provider/FCM tests remain release checks.
