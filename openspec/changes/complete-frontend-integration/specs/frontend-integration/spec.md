## ADDED Requirements

### Requirement: Truthful live requests
Live frontend requests SHALL use canonical backend contracts and SHALL surface failures without creating demo records or displaying fabricated live data.

#### Scenario: Booking API rejects a request
- **WHEN** a live booking request fails
- **THEN** the error is shown and no demo booking is created

### Requirement: Authorized screen data
Joined screen data SHALL require an active authorized role and participant ownership, exclude OTP secrets and unrelated private records, and preserve backend policy states.

#### Scenario: Foreign trip read
- **WHEN** an authenticated user requests another user's trip
- **THEN** the read is rejected

### Requirement: Private onboarding and scoped profile edits
Driver uploads SHALL use authenticated server-created upload IDs. Customer vehicle edits SHALL enforce ownership and reservation checks. Server roles, balances and approval SHALL remain protected.

#### Scenario: Foreign vehicle submitted in a profile update
- **WHEN** a customer submits another customer's vehicle ID
- **THEN** the update is rejected and the original vehicle is preserved

### Requirement: Verified payment and realtime state
Checkout SHALL use server-created Test Mode order amounts and show capture only after backend verification. Live trip/share/offer screens SHALL refresh state and stop location writes when the trip ends or the page unmounts.

#### Scenario: Checkout callback arrives before capture
- **WHEN** verification returns pending
- **THEN** the interface retains pending payment state

### Requirement: Deferred OTP delivery
Live OTP display and recovery SHALL remain unavailable until the owner approves a secure delivery contract. Demo OTP codes SHALL remain limited to explicit demo mode.

#### Scenario: Live customer views waiting trip
- **WHEN** secure OTP delivery is unavailable
- **THEN** the UI explains the pending verification flow and shows no invented code

### Requirement: Current route and place providers
Live preview geometry SHALL come from the server road provider. Browser autocomplete SHALL use session-scoped suggestions and fetch details only after selection; live trip marker changes SHALL preserve the existing map instance.

#### Scenario: Place prediction is selected
- **WHEN** the user selects one prediction after typing
- **THEN** one details request resolves its coordinates and ends that autocomplete session

#### Scenario: Driver selects a pickup zone away from their current position
- **WHEN** the driver selects a searched address or locality and supplies a radius
- **THEN** the selected place coordinates define the zone centre

### Requirement: Driver approval and available offers
Driver availability SHALL use current backend approval independently of the offer feed. Admin application decisions SHALL only be offered while an application is pending review.

#### Scenario: Approval while the driver is viewing application status
- **WHEN** the driver status refresh confirms approval
- **THEN** the driver moves to the dashboard and can go online with valid GPS

#### Scenario: Offers collection-group index is unavailable
- **WHEN** Firestore reports a missing offers index
- **THEN** the API finds open offers by reading only the authenticated driver's addressed offer documents under active bookings

#### Scenario: Driver opens another foreground driver screen
- **WHEN** an approved online driver opens their profile, earnings or trip cockpit
- **THEN** fresh presence continues to renew and a delayed renewal cannot reopen a shift that was explicitly closed

#### Scenario: Driver updates their hourly rate
- **WHEN** an approved driver saves a new rate without changing reviewed capabilities
- **THEN** the rate is persisted for future bookings and approval is preserved

### Requirement: Workspace notification isolation
Inbox reads and push delivery SHALL match the verified recipient account and authorized workspace.

#### Scenario: Device is enrolled by another account or workspace
- **WHEN** a browser token is registered for a different account or workspace
- **THEN** the previous binding is revoked and the browser ignores pushes for its previous channel

### Requirement: Consistent database selection
API reads, background workers and Firestore triggers SHALL target the same configured database. Test fixtures SHALL explicitly select their isolated emulator database.

#### Scenario: Named live database is configured
- **WHEN** FIRESTORE_DATABASE_ID names a database
- **THEN** HTTP services and background event handlers use that database without an implicit default-database split
