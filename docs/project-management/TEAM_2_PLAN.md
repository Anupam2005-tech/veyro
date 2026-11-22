# Team 2 — Anupam and Pritam feature plan

**Last updated:** 22 November 2026

This plan covers [Team 2’s scope](../veyro.md) in §12.3. Record task status and evidence in [Backend Progress](BACKEND_PROGRESS.md) and shared milestones and blockers in [Project Status](PROJECT_STATUS.md).

## Working agreement

- One active feature per person, at most two across Team 2. Finish implementation, tests, review fixes and merge before starting the next feature. `REVIEW` still occupies the owner's active slot.
- If blocked, record the dependency and next action. Review the partner's work or resolve the current feature's blocker; switching features requires an explicit parked-task handoff with no concurrent implementation left active.
- Each feature owner writes its contract, backend implementation, permission checks, meaningful tests and technical notes. The partner is the default reviewer. Shared contracts, security, financial and cross-team changes also require a named reviewer outside this pair under §12.7 before merge.
- Before coding, inspect existing work and the approved OpenSpec change, reconcile stale task statuses, agree exact allowed files and record the reviewer. Directory scopes below are planning boundaries, not permission to overwrite another team's work.
- Shared files (OpenAPI, contracts, Firebase config, middleware registration) have one agreed editor at a time. Use feature branches and small reviewable PRs.
- All frontend belongs to Team 1. Maps/GPS, presence/availability, notification delivery and sharing backend belong to Team 3. Team 2 publishes domain events and consumes those interfaces; it does not implement competing services.

## Current work slots

| Person | Active feature | Status | Reviewer | Next action |
|---|---|---|---|---|
| Anupam | T2-A1 — Backend foundation and local runtime | IN_PROGRESS | Pritam | Review BE-FND-006 and its shared HTTP contract change |
| Pritam | T2-P1 — Admin approval, controls and audit | BLOCKED | Anupam | Prepare the Admin API contract while waiting for T2-A2 and Team 1 interfaces |

When a feature starts, update this table and the corresponding rows in [Backend Progress](BACKEND_PROGRESS.md).

## Progress dashboard

| Feature | Owner | Status | Task IDs | Depends on | Handoff condition |
|---|---|---|---|---|---|
| T2-A1 — Foundation and local runtime | Anupam | REVIEW | BE-FND-001–010, INF-005, INF-007 | Readiness reconciliation and foundation approval | Build, type-check, local startup, emulator and shared-file evidence recorded |
| T2-A2 — Identity and authorization | Anupam | NOT_STARTED | BE-001–004, BE-041, INF-001, INF-003 | T2-A1 | Auth/App Check, role checks and cross-user denial tests pass |
| T2-A3 — Instant booking and assignment | Anupam | NOT_STARTED | BE-012–013 | T2-A2, T2-P2, Team 1 interfaces and Team 3 availability | Concurrent acceptance and reservation tests pass |
| T2-A4 — Scheduled booking lifecycle | Anupam | NOT_STARTED | BE-014, BE-034–035 | T2-A3 | Timing, expiry and retry-safe job tests pass |
| T2-A5 — Trip lifecycle and OTP | Anupam | NOT_STARTED | BE-016, BE-018 | T2-A3 and Team 3 location contract | Transition, OTP expiry and replay tests pass |
| T2-A6 — Waiting, no-show and cancellation | Anupam | NOT_STARTED | BE-015, BE-017 | T2-A4 and T2-A5 | Policy boundaries and duplicate-safe incident facts pass |
| T2-P1 — Admin approval and audit | Pritam | BLOCKED | BE-029–032 | T2-A2 and Team 1 application interfaces | Secure review, audit and control tests pass |
| T2-P2 — Fare calculation | Pritam | BLOCKED | BE-011, BE-042 | T2-A2 and domain interfaces | Quote and final-fare boundary tests pass |
| T2-P3 — Payment verification | Pritam | BLOCKED | BE-021–023 | T2-P2, T2-A5 and T2-A6 | Signature, duplicate and retry tests pass |
| T2-P4 — Ledger and disputes | Pritam | NOT_STARTED | BE-043 | T2-P3 and T2-A6 | Ledger invariants and audited adjustments pass |
| T2-P5 — Booking balance gate | Pritam | NOT_STARTED | BE-024 | T2-P4 and T2-A3 | Balance restriction and concurrency tests pass |
| T2-P6 — Reports, safety and SOS | Pritam | NOT_STARTED | BE-025–027, BE-033 | T2-P1, T2-A5, T2-A6 and T2-P4 | Privacy, suspension, restoration and SOS tests pass |

## Anupam — ordered feature queue

### T2-A1 — Backend foundation and local runtime

Tasks: BE-FND-001–010, INF-005, INF-007; Team 2 portions of FND-004/005/007/008/009/012/013/014/015/016.

Scope: API bootstrap/config/middleware, shared backend contracts, Functions packaging and emulator setup. Coordinate root workspace changes with Team 1 and runtime/billing access with the project lead.

Gate: approved foundation repair and shared-file ownership. Acceptance: validated config, single Firebase Admin initialization, safe errors/request IDs, health endpoint, documented API envelope, local startup and lint/type/build/emulator evidence. Cloud deployment is a later release gate, not implied by local configuration completion.

### T2-A2 — Identity and authorization

Tasks: BE-001–004, BE-041, INF-001, INF-003 (coordinate private-document rules with Team 1).

Depends on A1. Scope: auth module, identity middleware and shared authorization contracts. Acceptance: verified Firebase tokens/App Check, one UID with Customer/Driver roles, controlled Admin grants, provider-link conflict handling, cross-user/role denial tests, private data rules and safe logging. Review Team 3 rules without taking their implementation ownership.

### T2-A3 — Instant booking and atomic assignment

Tasks: BE-012–013, relevant INF-004 indexes.

Depends on A2, P2 quotes, P1 approval, customer/vehicle/driver interfaces agreed with Team 1 and Team 3 availability. Scope: bookings and assignment transactions. Acceptance: server-authoritative eligibility, reservation conflict protection, five-minute offer expiry, exactly one concurrent winner and stable domain events for Team 3. Agree on the balance-check interface with Pritam. Verify the full release booking flow again when T2-P5 integrates the balance gate.

### T2-A4 — Scheduled booking lifecycle

Tasks: BE-014, BE-034–035.

Depends on A3. Scope: scheduled booking handlers and their Functions. Acceptance: approved broadcast/expiry deadlines, reservation protection, NEEDS_REBOOK, retry-safe jobs and no duplicate assignment. Team 3 delivers notifications from these events.

### T2-A5 — Arrival, trip lifecycle and OTP

Tasks: BE-016, BE-018.

Depends on A3 and an agreed location-validation interface with Team 3. Use that interface for arrival and verify the full live GPS flow with Team 3 once BE-019 is ready. Scope: authoritative trip transitions and OTP services. Acceptance: verified arrival, assigned-driver checks, separate expiring single-use start/end codes, retry/attempt limits, invalid transition rejection and event publication. Coordinate completion/fare contract with P2/P3 before payment integration.

### T2-A6 — Waiting, no-show and cancellation

Tasks: BE-015, BE-017.

Depends on A4/A5 and approved cancellation reasons. Scope: booking/trip policy facts and charges. Acceptance: approved cancellation slabs, waiting boundaries, no stacked waiting/no-show charge, immutable qualifying incident facts and duplicate-safe events. Pritam owns ledger effects and suspension decisions using these facts.

## Pritam — ordered feature queue

### T2-P1 — Admin approval, controls and audit

Tasks: BE-029–032.

Depends on A2 and application/profile/document APIs agreed with Team 1. Scope: admin/audit services. Acceptance: secure document access, approve/reject/request-changes, mandatory reasons, append-only audit, deactivate/restore and unauthorized access denial. Team 1 builds every Admin screen. Later P6 integrates incident-based restoration without duplicating controls.

### T2-P2 — Fare estimates and final fare calculation

Tasks: BE-011, BE-042.

Depends on A2 and agreed customer/vehicle/driver/availability contracts. Scope: quote and shared server fare service. Acceptance: hourly actual usage, frozen rates/policies, zero platform fees, disabled PER_KM, approved exclusions and boundary tests. Finish this feature with quote integration tests and final-fare tests using trip fixtures. Publish the tested quote contract for A3. A5/A6 verify the final fare with actual trip and charge facts.

### T2-P3 — Payment orders and verification

Tasks: BE-021–023.

Depends on P2 and A5/A6 authoritative completion/fare facts. Scope: Razorpay Test Mode and webhook handlers. Acceptance: server-created amounts, callback signatures, raw-body webhook verification, duplicate/delayed events and retry-safe payment transitions. No live payment setup.

### T2-P4 — Ledger, earnings and disputes

Tasks: BE-043.

Depends on P3 and A6 charge facts. Scope: financial records and dispute/adjustment services. Acceptance: consistent customer balances/driver earnings, idempotent ledger entries, reasoned audited adjustments and dispute links. Follow approved policy; unresolved commercial decisions remain explicit blockers rather than invented defaults.

### T2-P5 — Booking balance gate

Tasks: BE-024.

Depends on P4 and A3. Scope: financial eligibility interface plus agreed booking integration. Acceptance: outstanding balance blocks booking as specified, disputes follow approved rules and retries/concurrent booking cannot bypass the gate. Anupam reviews the booking integration.

### T2-P6 — Reports, account safety and simulated SOS

Tasks: BE-025–027, BE-033.

Depends on P1, A5/A6 and P4 for financial-dispute integration. Scope: reports/safety/admin/SOS services. Acceptance: reporter privacy, audited resolution, fifth qualifying incident suspension, deduplicated incident counting, restoration audit and truthful simulated SOS. Publish approved events to Team 3; implement no external emergency dispatch.

## Shared verification and release

Each owner contributes tests with each feature and records evidence under BE-038–040. Anupam coordinates BE-039/040 and Pritam coordinates BE-038. Team 3 supplies tests for its own RTDB and share-token services. Record individual test slices and evidence in task notes.

Run the first milestone once A3, P1/P2, Team 1’s booking screens and Team 3’s availability and offer delivery are ready. An approved driver must receive and accept an instant booking. For the release, Anupam coordinates backend runtime identities, secrets, Functions configuration and rollback. Pritam verifies payment, Admin and safety regression results and hands the evidence to Dip.

Reassess the split after the first milestone. If one person is overloaded, agree which feature to transfer and update the owner and reviewer in both records.

## Progress update procedure

1. Start: record feature ID, named owner/reviewer, approved change, exact paths and dependency evidence in the backend task notes; activate the person's slot here.
2. During work: update only affected backend rows. Use `IN_PROGRESS`, `BLOCKED` or `REVIEW` honestly; include blocker/next action and date.
3. Handoff: record changed files, PR/commit, actual commands/results and remaining integration work. Required outside-pair reviewers must be named before merge.
4. Finish: mark `DONE` only with tests, independent review and merge evidence. Clear the slot, then start the next dependency-ready feature.
5. Milestone/blocker changes: update `PROJECT_STATUS.md`. Supply verified technical notes/screenshots/test evidence to Dip. Frontend status is maintained by Team 1.

Task-note format: `Feature: T2-...; updated: YYYY-MM-DD; reviewer: ...; change/paths: ...; evidence: ...; blocker/next: ...`.
