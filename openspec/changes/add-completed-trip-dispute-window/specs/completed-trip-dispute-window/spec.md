## ADDED Requirements

### Requirement: Validate completed-trip dispute timing

A dispute tied to a completed trip SHALL be timely within 48 hours of authoritative trip completion. Timing evaluation SHALL leave the ledger untouched.

#### Scenario: Deadline boundary

- **WHEN** the server receives the dispute exactly 48 hours after completion
- **THEN** the timing check reports it as timely

#### Scenario: Deadline exceeded

- **WHEN** the server receives the dispute after the deadline
- **THEN** the timing check reports it as late
