## ADDED Requirements

### Requirement: Record authorized Admin state changes

The backend SHALL append an entry to `adminAuditLogs` for a successful sensitive Admin state change. The entry SHALL contain the verified actor ID, action, entity type and ID, relevant before and after values, a nonblank reason, and a server-generated timestamp.

#### Scenario: Authorized Admin action

- **WHEN** an authorized Admin submits a valid state change with a reason
- **THEN** the backend commits the change and a new audit record together

#### Scenario: Missing reason or unauthorized caller

- **WHEN** the request has a blank reason or the caller lacks verified Admin authorization
- **THEN** the backend rejects the operation without changing the record or appending an audit entry

#### Scenario: Audit write fails

- **WHEN** a transaction cannot append the audit record
- **THEN** the associated state change is not committed

### Requirement: Preserve audit history

The audit module SHALL support creation of audit records and SHALL prevent alteration of existing entries through its write interface. Entries SHALL exclude private document contents and credentials.

#### Scenario: Existing record is targeted

- **WHEN** a write attempts to replace an existing audit record
- **THEN** the write fails and the original record remains intact
