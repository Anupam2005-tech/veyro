## ADDED Requirements

### Requirement: Quote-bound booking creation
The service SHALL persist a server-built hourly snapshot and create at most one booking for the quote owner using authorized server facts.

#### Scenario: Duplicate creation
- **WHEN** the owner retries creation with the same quote and pickup
- **THEN** both calls identify one booking with the original frozen terms and one creation event

### Requirement: Atomic assignment
The service SHALL require an addressed offer, a current eligibility check, an open time window and an available reservation before assigning a driver. Reservation, acceptance and the assignment event SHALL commit atomically.

#### Scenario: Conflicting acceptances
- **WHEN** drivers compete for one booking or one driver accepts overlapping bookings
- **THEN** only one conflicting assignment commits

#### Scenario: Instant deadline
- **WHEN** five minutes have elapsed since creation
- **THEN** acceptance fails, and advancing the booking records expiry once without reassigning it

### Requirement: Scheduled lifecycle
The service SHALL admit pickups four hours through thirty days ahead. The broadcast opens at the later of creation and pickup minus twelve hours and closes exclusively at pickup minus two hours.

#### Scenario: Late creation and expiry
- **WHEN** a customer books four to twelve hours before pickup and no driver accepts by closing
- **THEN** the broadcast opens immediately and deadline processing transitions once to NEEDS_REBOOK

### Requirement: Cancellation evidence
The service SHALL use server timestamps, the frozen policy version and trusted trip and reason checks to record the actor, reason, description, fee and event atomically with cancellation and reservation release.

#### Scenario: Scheduled customer cancellation
- **WHEN** an assigned customer cancels more than five minutes after acceptance but before arrival
- **THEN** the charge is INR 50 unless a verified driver no-show qualifies for zero; identical retries return the recorded fee
