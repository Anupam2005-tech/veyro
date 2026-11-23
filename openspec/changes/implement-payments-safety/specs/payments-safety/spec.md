## ADDED Requirements

### Requirement: Server-authoritative payment
The API SHALL use an owned confirmed invoice to create one active Test Mode order attempt, verify signatures and server-side capture, and atomically deduplicate financial settlement.

#### Scenario: Concurrent creation
- **WHEN** the same invoice receives repeated or concurrent order requests
- **THEN** requests reuse one Razorpay order, and recovery from an uncertain response uses the original provider receipt

#### Scenario: Failed attempt or cancelled checkout
- **WHEN** an attempt fails or the customer closes checkout
- **THEN** the invoice keeps its existing Razorpay order, and the customer can check its most recent provider status before reopening checkout

#### Scenario: Repeated capture
- **WHEN** multiple signed notifications identify the same captured payment
- **THEN** the confirmed invoice transitions once and one capture receipt exists

#### Scenario: Missed or delayed capture notification
- **WHEN** the customer checks the status of an owned invoice after a callback or webhook is missed
- **THEN** the server checks payments on the linked Razorpay order and applies the same atomic settlement when a matching capture is confirmed

### Requirement: Private safety actions
The API SHALL authorize trip participants, keep reports private to their reporter and Admins, and record Demo SOS without claiming external delivery.

#### Scenario: Report resolution
- **WHEN** an active Admin resolves a report with a note
- **THEN** resolution, append-only audit and reporter inbox record commit together

### Requirement: Verified incident enforcement
The incident processor SHALL count each trusted qualifying incident once and suspend an active account at its fifth qualifying incident.

#### Scenario: Duplicate processing
- **WHEN** processors race on the same incident
- **THEN** only one increment commits

### Requirement: Durable notifications
The system SHALL scope inbox records to their owner and attempt generic FCM delivery with leases and bounded retries.

#### Scenario: Simultaneous dispatch
- **WHEN** workers attempt the same notification
- **THEN** a lease serializes sends and the durable inbox remains available

#### Scenario: Transactional email delivery
- **WHEN** an eligible account, application, profile, trip, booking or payment transition commits
- **THEN** its inbox event queues at most one Resend email to the current verified address, subject to applicable preferences, with bounded idempotent retries
