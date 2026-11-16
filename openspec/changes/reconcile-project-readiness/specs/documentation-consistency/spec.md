## ADDED Requirements

### Requirement: Owner baseline authority and decision classification
The documentation SHALL reconcile the complete three-part owner Working Decision Baseline, preserve Unified product authority and Backend engineering reference, and classify entries as Established project decision, Newly adopted working decision, Technical verification required or Explicitly deferred. Superseded wording SHALL retain honest approval provenance. Agents MUST NOT independently approve unresolved policy.

#### Scenario: Older policy conflicts with adopted working decision
- **WHEN** an older manual-only, lifetime-counter, single-role or mandatory-success-meta rule conflicts with the owner baseline
- **THEN** the documentation records supersession and the adopted rule without pretending the source code is already corrected.

### Requirement: Driver approval reconciliation
The documentation SHALL describe score >=50 approval subject to hard stops, score <=49 Admin review, the recommended 35/20/20/15/10 rubric, unverifiable-information review, authorized manual approve/reject and audit reasons. Missing mandatory documents, expired licences, suspected forgery and material identity mismatch MUST prevent automatic approval. No AI-only decision or unintegrated external verification claim is permitted.

#### Scenario: High score with hard stop
- **WHEN** a proposed acceptance scenario has score50 or higher and an expired licence
- **THEN** it forbids automatic approval and does not fabricate an automatic Admin rejection.

### Requirement: Scheduled timing and fare reconciliation
The documentation SHALL retain 4h minimum/30day maximum, pickup−12h opening/pickup−2h cutoff, first eligible valid acceptance and UNFULFILLED notification. It SHALL describe customer expected duration/rate cap, eligible rate range, within-cap offers, accepting-driver rate lock, estimate before final assignment and customer-approved amendments. Unresolved late-created-window and final customer-confirmation semantics MUST remain visible.

#### Scenario: Scheduled confirmation gap
- **WHEN** final assignment behaviour is documented
- **THEN** the confirmed-estimate requirement is preserved and no unapproved confirmation timeout/state or reassignment policy is invented.

### Requirement: Location and retention boundaries
The documentation SHALL distinguish foreground online discovery, accepted pickup coordination, active-trip access and completed/cancelled cleanup. It MUST prohibit unrelated precise-location access and default unrestricted Admin tracking, require authenticated revocable-token sharing, and describe ephemeral RTDB cleanup on offline/completion with cancellation cleanup and a maximum24h fallback. No raw permanent GPS history or invented legal retention period is permitted.

#### Scenario: Cleanup fallback and production restriction
- **WHEN** retention requirements are reviewed
- **THEN** 24h is a cleanup ceiling rather than intentional retention, real-data production waits for an approved schedule and synthetic emulator work remains permitted.

### Requirement: Financial and safety policy preservation
The documentation SHALL retain fifth qualifying incident suspension within rolling12mo, excluded technical failures/exceptions, corroborated driver no-show evidence, no driver monetary no-show penalty, audited investigation/restoration, adopted INR0/50/100 cancellation fees, free15min waiting, qualifying INR50 waiting and INR150 customer no-show after30min replacing waiting. It SHALL record 48h post-completion dispute submission, reason/evidence, Admin decision, seven-day target and no automatic financial adjustment solely from complaint submission.

#### Scenario: No-show charge replaces waiting
- **WHEN** the customer-no-show acceptance example applies INR150
- **THEN** it does not also apply INR50 waiting and preserves the auditable validation requirement.

### Requirement: OTP amendments overlap and document limits
The documentation SHALL specify distinct single-use start/end codes valid5min, max5 wrong attempts, 60s resend cooldown, controlled regeneration and audited authorized recovery. Pickup change SHALL require pre-arrival driver acceptance and recalculation; after-arrival change requires cancellation/new booking. Accepted windows SHALL not overlap and include30min buffer. Upload rules SHALL specify JPEG/PNG/PDF, max10MB, server-side content/type/ownership validation, private storage and re-verification after sensitive replacement/expiry.

#### Scenario: Arrival already confirmed
- **WHEN** the pickup-change example occurs after arrival
- **THEN** it requires cancellation/new booking rather than using the obsolete before-trip-start permission.

### Requirement: Scope and canonical state documentation
The documentation SHALL retain Standard/Premium/Luxury with eligibility unresolved before matching, informational fuel, category/transmission compatibility, deferred ratings/favourites, and canonical booking progression REQUESTED→SEARCHING→DRIVER_ASSIGNED→DRIVER_EN_ROUTE→DRIVER_ARRIVED→IN_PROGRESS→COMPLETED with terminal CANCELLED/EXPIRED/UNFULFILLED. Scheduled requests remain REQUESTED before broadcasting; instant requests enter SEARCHING immediately. Allowed/rejected transitions SHALL be documented without conflating booking, application, payment or account states.

#### Scenario: Unapproved category mapping
- **WHEN** legacy Hatchback/Sedan/SUV examples are reconciled
- **THEN** no automatic mapping to Standard/Premium/Luxury is asserted and matching remains dependent on approved criteria.

### Requirement: Identity and server authorization documentation
The documentation SHALL support Customer and Driver roles on one UID, separately lead-authorized Admin, verified provider linking and secure conflicts without silent merges. Firebase ID tokens, backend role/resource authorization and App Check SHALL protect client-facing operations; only justified server-to-server routes are exempt with provider verification. Admin SDK access SHALL be explicitly authorized. Health responses SHALL expose no sensitive information.

#### Scenario: Webhook security differs from browser attestation
- **WHEN** the Razorpay webhook is documented
- **THEN** its justified App Check exemption retains provider-signature verification and does not permit client-controlled payment state.

### Requirement: Canonical API and response reconciliation
The documentation SHALL use the nine exact paths in design.md and make backend OpenAPI the API contract authority. Responses SHALL use JSON envelopes, success data with optional meta, structured errors with request IDs, consistent statuses and no bodyless204. Early request IDs and global safe errors SHALL include parsing/validation failures. express-validator SHALL remain selected; unresolved message/error-layout details MUST NOT be silently selected.

#### Scenario: Conflicting arrival examples
- **WHEN** old `/arrive` or `/arrivals` examples are reconciled
- **THEN** the active contract uses `/api/v1/trips/:tripId/arrival` without adding an unapproved alias.

### Requirement: Durable schema and transactional invariants
Documentation SHALL specify UID ownership, stable IDs, field types, collections, query/index requirements, server-only protected fields and atomic transaction boundaries within the strict routes/controllers/services/repositories/models/validators monolith. Firestore SHALL own durable truth; RTDB SHALL own ephemeral live state.

#### Scenario: Concurrent acceptances
- **WHEN** two acceptance attempts target the same booking
- **THEN** the documented invariant and future tests require at most one driver assignment through server authorization and atomic checks.

### Requirement: Technical targets are not verification claims
Documentation SHALL record Node22, pinned stable TS5, Next16 Active LTS target with compatible React, pinned pnpm/lockfile and no production canary. Actual App Hosting build compatibility SHALL remain unverified until tested; incompatibility requires reporting evidence and an alternative without silent downgrade. P01 recommended Mumbai data/Functions and Singapore App Hosting with supported RTDB selection SHALL retain availability/latency/residency/cost verification and separate provisioning authorization.

#### Scenario: Existing Hong Kong code remains unchanged
- **WHEN** this documentation proposal is prepared or applied
- **THEN** the source discrepancy is listed for later authorized repair and is neither silently changed nor represented as compliant deployment.

### Requirement: Seven-member workflow and honest tracking
Documentation SHALL preserve approved M1 UI/PWA, M2 customer, M3 Maps/GPS/realtime, M4 driver/notifications, M5 identity/security/infrastructure, M6 booking/fare/trip and M7 payments/Admin/safety ownership with reviewers, interfaces and evidence-based statuses. The lead alone SHALL retain Owner; no shared credentials. Shared OpenSpec proposal/review SHALL precede meaningful work across the three assistants.

#### Scenario: Scaffold file exists without release evidence
- **WHEN** a tracker is reconciled
- **THEN** existence alone does not produce DONE, and domain tests/integration/deployment preparation are distributed instead of assigned entirely to M5.

### Requirement: Documentation-only application boundary
Preparation SHALL write only supported artifacts beneath this change directory. Application SHALL await explicit owner approval and modify only the13 documentation targets in design.md. Source, packages, lockfile, configuration, trackers outside approved application, agent adapters, rules, cloud state and graphs MUST remain untouched during preparation. Foundation repair and feature work require subsequent authorization.

#### Scenario: Proposal artifacts validate
- **WHEN** OpenSpec reports artifacts complete and strict validation passes
- **THEN** application is still unauthorized, tasks remain unchecked, and no runtime readiness claim follows.
