## Booking core delivery

| Task | Implemented and tested | Pending for end-to-end completion |
|---|---|---|
| BE-011 | Persist owner, vehicle, route and immutable hourly policy/rate snapshot | Pritam and partner teams integrate verified quote inputs and eligibility |
| BE-012 | Owner-bound, retry-safe creation and transactional state transitions | Verified customer, vehicle, balance and quote-validity adapter; HTTP integration |
| BE-013 | Five-minute instant offers, targeted rejection/acceptance, serialized driver reservations and events | Verified driver eligibility, availability, expiry trigger and client delivery |
| BE-014 | Queuing, addressed scheduled offers, first acceptance, retries and NEEDS_REBOOK at the cutoff | Deadline workers, recipient selection, notification delivery and recovery UI |
| BE-015 | DEC-05 calculation, ownership, reason and policy checks via adapter, immutable cancellation fact and release | Approved reason taxonomy, authoritative trip/no-show facts, incident and ledger integration |

- [x] Build and type-check the API and exercise the booking service with the local Firestore emulator.
- [ ] Complete integration with verified identities and authoritative upstream services.
- [ ] Review shared transaction and event contracts with the consuming teams before merge.

## Team 2 completion follow-up

Booking HTTP routes, production adapter, accepted-rate/promise freezing, cancellation charge producers and expiry/broadcast Functions now exist. Partner producer fields and remaining integration gates are recorded in complete-team2-backend. [Execution register](../complete-team2-backend/tasks.md).
