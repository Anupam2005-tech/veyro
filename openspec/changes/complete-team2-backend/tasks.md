## Team 2 execution register — updated 23 November 2026

| Order | Task IDs | Work delivered | Status | Remaining dependency |
|---|---|---|---|---|
| 1 | BE-016 | Assigned-booking initialization, owned trip reads, customer-confirmed and trusted-GPS arrival | REVIEW | GPS verdict producer implemented in follow-up; real device validation remains |
| 2 | BE-017–018 | Waiting/no-show transactions, customer-only issuance, separate salted OTP hashes, up to 5min expiry, five attempts, 60s cooldown, atomic consumption | REVIEW | Deploy with `TRIP_OTP_SECRET`; lockout recovery still requires approval |
| 3 | BE-042–043 | Final rounded hourly fare, payable and earnings, capture journal, 48h completed-trip disputes, audited unpaid corrections | REVIEW / BLOCKED | No-trip dispute timing, no-show allocations and captured-payment refund/settlement rules |
| 4 | BE-030–032 | Protected manual review queue/decisions, synchronized driver approval, deactivate/restore, customer restoration, atomic audit/inbox | REVIEW | Profile/application producers implemented in follow-up; independent review remains |
| 5 | BE-041 | Verified provider inspection, lead-only audited role grants, legacy/multi-role profiles | BLOCKED | Owner will supply lead Firebase UID later; client credential linking/conflict recovery is a Team 1 handoff |
| 6 | BE-011–015, BE-024 | Quote/booking/offer/cancel endpoints, production eligibility adapter, frozen accepted rate and promise, payable/balance serialization | REVIEW / BLOCKED | Backend producers implemented in follow-up; canonical frontend DTO integration and live road provider remain |
| 7 | BE-034–035 | Due-window expiry and scheduled broadcast Functions, full candidate scans, recipient inbox and composite indexes | REVIEW | Cloud deployment and actual managed invocation |
| 8 | BE-021–029, BE-033 | Trip and charge producers connected, receipt-based order reconciliation, Admin SOS reads, approved report/cancellation defaults | REVIEW / BLOCKED | Actual capture/webhook/FCM/App Check verification, webhook secret and verified qualifying incident producers |
| 9 | INF-001, INF-003–005, INF-007 | Signed/unsigned Firestore/Storage rules tests; generated standalone Functions artifact, independent dependency install and Node22 module load | REVIEW | Actual cloud deployment, IAM, Secret Manager and remaining partner-owned services |
| 10 | BE-038–040 | Final Node22 Auth/Firestore/Storage suite, financial invariants, OTP/waiting boundaries, Admin authorization and scheduled worker tests | REVIEW / BLOCKED | RTDB/share-token tests added in follow-up; cloud/device and frontend integration remain |
| 11 | BE-FND-001–010, BE-001–004 | API/Functions builds, current foundation and identity regression checks | REVIEW | Independent review and real App Check integration |

## Verification evidence

| Check | Result |
|---|---|
| API and Functions build/type-check | Passed |
| Final API/rules suite | 63 passed, zero failures/skips under Node v22.23.5, with Auth, Firestore and Storage emulators |
| Test file scheduling | Files run sequentially; explicit concurrent transaction races remain inside tests |
| Standalone deployment package | Installed its own pinned runtime dependencies; six handlers loaded at this checkpoint; follow-up packaged smoke loads all eight |
| Packaged Functions HTTP check | HTTP 200 through Functions emulator under Node22 with corrected runtime dependency pins; hosted socket PORT regression repaired |
| Provider order smoke test | Created one INR1 Razorpay Test Mode order and verified receipt lookup; no payment captured |
| Real delivery/capture | Pending actual webhook configuration, FCM test device, App Check token and runtime IAM |

## Owner decisions recorded

- [x] Use the confirmed current scheduled window with immediate broadcast at creation 4–12h ahead and NEEDS_REBOOK at cutoff.
- [x] Keep lifetime incident counters.
- [x] Adopt the proposed report and customer/driver cancellation lists as versioned initial defaults.
- [x] Keep incident qualification/exclusions and no-trip dispute rules pending.
- [x] Enable owner-approved customer-only start/end OTP display on 24 November 2026.
- [x] Leave ADMIN_GRANTER_UID unset until the owner supplies their Firebase UID.
- [x] Generate a private local TRIP_OTP_SECRET without printing or committing it.

## Remaining release gates

- [x] Implement profile, route, availability and GPS producers against the documented adapter fields; see the core/mobility follow-up.
- [ ] Verify live Maps/device behavior and frontend canonical endpoint/DTO integration.
- [x] Implement customer-only start/end OTP display.
- [ ] Approve a recovery process for verification locked after five failed attempts.
- [ ] Supply the real lead UID and verify controlled grants with the intended account.
- [ ] Approve incident qualification/exclusions, no-trip disputes and unresolved settlement rules.
- [ ] Configure and verify actual captured Test Mode payment/webhook, FCM and deployed App Check.
- [ ] Complete deployment/IAM/Secret Manager verification and partner/outside-pair financial/security reviews.


## Hosted-runtime follow-up — 23 November

- [x] Reproduce the Functions emulator socket PORT startup failure.
- [x] Use embedded config for the Express factory while retaining numeric PORT validation in standalone server startup.
- [x] Add a regression test covering both entry points.
- [x] Verify the packaged Functions HTTP endpoint under Node22.
- [x] Resolve deployment dependency versions from the declaring package.
- [x] Hosted-runtime regression suite passed 63 tests under Node22. Customer notification integration is included in the final rerun.
- [ ] Verify actual scheduled invocation/cloud resources; local worker logic is tested, while the Functions smoke check exercised the HTTP endpoint.

The working tree contains a separately introduced missing-token App Check bypass outside production. That behavior is preserved; production enforcement is explicitly exercised in the identity tests.

Booking state events now create the customer inbox record in the same transaction. Expiry replay tests verify the resulting notification alongside the unique event.

## Core/mobility follow-up — 23 November

The [core/mobility execution register](../complete-core-mobility-backend/tasks.md) supersedes the historical 63-test checkpoint above. Final suite: **74 passed**, no failures/skips, under Node22 with Auth, Firestore, Storage and RTDB. All eight packaged Functions handlers load and API health returns HTTP 200. Profile, upload, road eligibility, GPS, sharing, cleanup and scheduled-overrun regression coverage are included. Live configuration, frontend alignment and explicit owner-held policies remain release gates.
