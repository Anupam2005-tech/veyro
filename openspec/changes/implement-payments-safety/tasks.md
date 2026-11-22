## Payments and safety

| Task | Local implementation | Remaining integration |
|---|---|---|
| BE-021 | Claimed Test Mode order attempts and stored owner/amount | Real provider test, final payable producer and ambiguous order reconciliation |
| BE-022 | Raw-body signature verification, Checkout signatures and provider capture fetch | Real provider callback/webhook verification |
| BE-023 | Transactional event deduplication and capture receipt | Full ledger and settlement rules under BE-043 |
| BE-024 | Scoped payable query in booking transaction | Authoritative charge/ledger producer and dispute updates |
| BE-025 | Participant reports, approved categories, private reads and Admin resolution | Approved category configuration and trip producer |
| BE-026 | Idempotent Demo SOS recording and audited cancellation | Authoritative trip/GPS source and console integration |
| BE-027 | Verified incident trigger and fifth-incident suspension | Qualifying evidence producers, availability removal and policy reconciliation |
| BE-028 | Owned inbox, token registration/removal, FCM worker and bounded retry schedule | Real FCM test, deployed functions/index and Team 3 event handoff |
| BE-029 | Real Admin report action and audit commit together | Other Admin endpoint integrations |

- [x] Build and type-check API and Functions locally.
- [x] Final emulator suite passed all 48 API tests with Auth and Firestore, with zero skipped tests. Razorpay and FCM used test doubles.
- [ ] Verify upstream trip, invoice, incident and category producers.
- [ ] Verify actual Test Mode Razorpay and FCM delivery.
- [ ] Partner review of financial/security/shared interfaces before merge.
