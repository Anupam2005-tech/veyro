## ADDED Requirements

### Requirement: Owned core records
Profile and vehicle endpoints SHALL derive identity from verified authentication, preserve server-owned roles/status and reject changes to another user's records.

#### Scenario: Cross-user vehicle mutation
- **WHEN** a customer attempts to update another customer's vehicle
- **THEN** the API rejects it and preserves the vehicle owner

### Requirement: Private document submission
The server SHALL validate owner, size and content signature, write immutable private objects and accept application documents only through server-created verified upload records.

#### Scenario: Forged document metadata
- **WHEN** submission references an unverified or foreign upload
- **THEN** the application is not submitted

### Requirement: Road-based eligibility
Routing SHALL use server-side Google road routes; eligibility SHALL check current approval, compatibility, approved service-area bounds, presence, radius and reservations.

#### Scenario: Scheduled refresh
- **WHEN** a stored scheduled booking reaches its broadcast window after its original route quote expires
- **THEN** fresh pickup eligibility may be computed for that stored booking while its original quote remains frozen

#### Scenario: Scheduled trip overruns
- **WHEN** a scheduled trip remains active beyond its estimated reservation end
- **THEN** eligibility and transactional acceptance reject a new instant assignment until the active trip ends

### Requirement: Scoped live location
GPS writes SHALL require the assigned driver and an active trip, reject stale/out-of-order/implausible samples, and publish only the latest location.

#### Scenario: Trip termination
- **WHEN** a trip terminates
- **THEN** ephemeral Firestore location/evidence is removed and the RTDB location is fenced against late updates

### Requirement: Authenticated sharing
A share SHALL store only a token hash, require recipient authentication and expose a limited approximate trip view while active.

#### Scenario: Revocation or completion
- **WHEN** the owner revokes a link or the trip ends
- **THEN** the token no longer grants access
