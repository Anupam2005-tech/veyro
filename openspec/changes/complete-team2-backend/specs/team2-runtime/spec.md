## ADDED Requirements

### Requirement: Authoritative trip lifecycle
Trip services SHALL use the assigned booking, verified caller identity and server timestamps for transitions, charges and completion.

#### Scenario: Concurrent transitions
- **WHEN** a transition is repeated or raced
- **THEN** the transaction records the transition once and preserves its original timestamps and financial facts

### Requirement: Recorded execution progress
Every remaining Team 2 task SHALL record implementation evidence, test results and unresolved dependencies in the execution register.

#### Scenario: External dependency remains
- **WHEN** local implementation passes but an upstream interface or external integration is unavailable
- **THEN** the tracker identifies that dependency and keeps completion pending

### Requirement: Controlled financial corrections
Unpaid corrections SHALL require an active Admin, a reason, no active provider order, an idempotency key and an append-only audit. Captured funds SHALL remain unchanged by this correction operation.

#### Scenario: Correction replay
- **WHEN** the same correction is submitted twice
- **THEN** only one adjustment is applied and its original amounts remain authoritative

### Requirement: Customer-authorized arrival fallback
A customer-confirmed arrival SHALL require the assigned customer and an eligible trip state.

#### Scenario: Unrelated customer
- **WHEN** an unrelated caller requests arrival confirmation
- **THEN** the trip remains unchanged and access is denied

### Requirement: No-show replacement charge
The customer no-show charge SHALL replace the waiting charge at the thirty-minute threshold. Driver allocation SHALL remain pending until its policy is approved.

#### Scenario: No-show retry
- **WHEN** the assigned driver repeats a successful no-show request
- **THEN** the original single INR150 payable remains and no waiting fee is added

### Requirement: Deployment artifact
The deployment workflow SHALL package compiled API/Functions and docs with runtime dependencies, excluding workspace links and local environment secrets.

#### Scenario: Standalone loading
- **WHEN** dependencies are installed in the generated artifact
- **THEN** its Functions entry point loads under the declared Node22 runtime

### Requirement: Embedded hosting configuration
The Express app factory SHALL support a host-owned PORT value while standalone server startup continues to validate its numeric listening port.

#### Scenario: Functions socket port
- **WHEN** the host supplies a Unix socket through PORT
- **THEN** embedded Express creation succeeds and the host remains responsible for listening

#### Scenario: Standalone invalid port
- **WHEN** standalone server startup receives a nonnumeric PORT
- **THEN** configuration validation rejects startup
