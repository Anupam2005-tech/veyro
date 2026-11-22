## ADDED Requirements

### Requirement: Role authorization
The role middleware SHALL authorize only a verified caller with an active Firestore profile and at least one allowed role. A roles array is authoritative when present; legacy profiles may have one role.

#### Scenario: Role mismatch
- **WHEN** the stored roles do not authorize the requested operation
- **THEN** the API returns 403 even if the request claims an allowed role

### Requirement: Session bootstrap
The API SHALL create or sync the verified caller's profile transactionally. New callers may select Customer or Driver. Subsequent calls preserve stored grants and onboarding data.

#### Scenario: Repeat bootstrap
- **WHEN** two session requests for the same verified UID arrive together
- **THEN** they reference the same profile and preserve server-owned fields

### Requirement: App Check consumption
The session operation SHALL consume the supplied limited-use token through the Admin SDK before accessing a profile.

#### Scenario: Replay
- **WHEN** the verifier reports a previously consumed token
- **THEN** the session operation returns 403 and performs no profile write
