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

## Team 2 completion follow-up

Trip completion/cancellation/no-show payables, capture ledger entries, approved category defaults, order reconciliation and Admin action integrations now exist. One live Test Mode order/receipt lookup passed. Capture/webhook/FCM and unresolved policy gates remain pending. [Execution register](../complete-team2-backend/tasks.md).

## Razorpay checkout follow-up

| Task | Result | Status |
|---|---|---|
| BE-021 | Retain one Razorpay order per invoice, reuse it across failed attempts and browsers, and recover an interrupted create with the original receipt | REVIEW |
| BE-022–023 | Reconcile through the owned status endpoint or signed webhooks. Delayed failures, late capture and duplicate deliveries converge on a single capture and receipt | REVIEW |
| FE-037, FE-054 | Show verified status on the receipt and outstanding-balance screens, with retry and status checking after interrupted checkout | REVIEW |
| Provider sign-off | Configure Test Mode auto-capture and the staging webhook, then verify capture and webhook receipt using a Razorpay test payment | PENDING |
| BE-043 | Captured-payment refunds, settlement and allocation require the approved financial rules | BLOCKED |

Local verification passed 87 API tests with Firebase emulators and 16 web tests. The payment HTTP regression uses simulated Razorpay responses and signed events, including a failed attempt that later captures and multiple concurrent verification paths.

| Follow-up | Status | Evidence or remaining check |
|---|---|---|
| BE-028 transactional email | REVIEW | Server-side outbox, verified recipients, event templates, preference checks and bounded retries. Verify real Resend delivery after configuring the sender and deploying the Functions. |
| FE-017 service areas | REVIEW | Google Places search, keyboard selection and multiple removable areas. Reviewed pickup coverage remains a separate input. |
