## 1. BE-021–023

- [x] 1.1 Implement and test checkout and raw-webhook signature verification (BE-022).
- [ ] 1.2 Create Test Mode orders from the authorized stored amount and attempt identity (BE-021). Await BE-016, BE-042 and A6 charge facts.
- [x] 1.3 Wire raw bytes and verified capture into the API and store webhook event identity and state transitions atomically (BE-022/023).
- [ ] 1.4 Verify with Test Mode and independent review.

Local HTTP wiring, attempt storage and capture transactions are recorded in [M4](../implement-payments-safety/tasks.md). Task 1.2 remains pending authoritative invoice production and real Test Mode verification.
