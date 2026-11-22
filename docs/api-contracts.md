# Veyro API contract

The [OpenAPI contract](../apps/api/docs/openapi.yaml) describes the running API. For local development, set `ENABLE_API_DOCS=true` in `apps/api/.env`, restart the API, and open [Swagger UI](http://localhost:4000/api/v1/docs/). Adjust the port if needed. The UI serves its assets locally. Production disables the UI and its YAML endpoint.

Use **Try it out** on `GET /api/v1/health` to check the running process. The response includes the request ID and a UTC timestamp.

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
