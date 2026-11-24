## ADDED Requirements

### Requirement: Admin workspace authorization
Admin access SHALL use the account's active authorized roles independent of the selected driver or customer workspace. Admin sign-in SHALL accept only an Admin return path.

#### Scenario: Driver also has Admin privileges
- **WHEN** a signed-in account with Driver and Admin roles opens the Admin dashboard
- **THEN** the Admin dashboard opens without switching to the Driver workspace

### Requirement: Private trip contact
During an active trip, the assigned customer and driver SHALL be able to exchange short messages and start, answer, or decline in-app voice calls. Contact endpoints SHALL deny other accounts and terminal trips. Phone numbers SHALL stay private. Voice signaling and recent messages SHALL be removed on trip closure.

#### Scenario: A share recipient tries to contact a participant
- **WHEN** a viewer of an authenticated share tries to access trip contact without being a participant
- **THEN** the API rejects the request

### Requirement: Firebase email and password
The auth screen SHALL support Firebase email/password sign-up, sign-in and password reset. Google sign-in remains available. The auth form SHALL omit magic-link and SMS sign-in.

#### Scenario: A customer signs in with email
- **WHEN** the customer submits a valid email and password
- **THEN** Firebase signs them in and the app loads their customer session

### Requirement: Live pickup ETA and verified driver no-show
The trip cockpit SHALL display an en-route pickup ETA from backend road routing while GPS and the route estimate are fresh. The service SHALL throttle estimate requests and preserve the frozen arrival promise for no-show eligibility. The trip owner may report a driver no-show after the 20-minute grace period. Admin confirmation with an evidence note SHALL end the still-eligible trip without charging the customer and record one qualifying incident.

#### Scenario: An overdue pickup is reported
- **WHEN** the booked customer reports the missed pickup and an Admin verifies the missed pickup
- **THEN** the decision, evidence and no-show outcome are recorded together and retries do not count another incident

#### Scenario: Location updates become stale
- **WHEN** the driver GPS becomes stale during pickup
- **THEN** the cockpit hides the live ETA and the frozen arrival promise remains available for eligibility

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

#### Scenario: An assigned driver verifies the end code
- **WHEN** the customer's trip view receives completed status and a payable final fare
- **THEN** it prompts the customer to continue to Razorpay using the final server amount or pay later from the receipt

### Requirement: Customer-only trip verification codes
The authenticated, active booking customer SHALL be able to request a start code after arrival and a separate end code during the trip. The code SHALL be returned only by the issuance request in a private, non-cacheable response and SHALL be excluded from trip views, share views and persisted browser state. The backend SHALL store a salted hash and enforce expiry, cooldown, the existing attempt limit and single use. Only the assigned driver may verify a code. Demo codes SHALL remain limited to explicit demo mode.

#### Scenario: Driver and customer verify both stages
- **WHEN** the booking customer requests the current code and the assigned driver enters it before expiry
- **THEN** the start code starts trip timing, or the end code completes the trip and generates the final fare

#### Scenario: Another user requests a code
- **WHEN** any account other than the booking customer requests a trip code
- **THEN** the request is rejected, including when that account is the assigned driver and also has a customer role

#### Scenario: A code cannot be issued
- **WHEN** the phase is unavailable, a recent code is still within its cooldown, or verification is locked
- **THEN** the customer sees the server error and no replacement code is issued

### Requirement: Current route and place providers
Live preview geometry SHALL come from the server road provider. Browser autocomplete SHALL use session-scoped suggestions and fetch details only after selection; live trip marker changes SHALL preserve the existing map instance.

#### Scenario: Map tiles fail to load
- **WHEN** Google Maps has not loaded its tiles or reports a loading or authorization failure
- **THEN** the interface shows the available route geometry and markers as a route preview and explains a confirmed map failure

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
