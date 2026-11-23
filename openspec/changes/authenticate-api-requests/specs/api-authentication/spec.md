## ADDED Requirements

### Requirement: Verified request identity
Protected API routes SHALL verify a single bearer ID token using Firebase Admin with revocation checking before dispatching to a controller.

#### Scenario: Valid Firebase ID token
- **WHEN** the token verifies for an enabled user
- **THEN** the request carries the verified UID regardless of client-supplied identity or role fields

#### Scenario: Authentication denied
- **WHEN** credentials are missing, malformed, invalid, expired, revoked or identify a disabled or deleted user
- **THEN** the middleware returns a 401 bearer challenge with the standard error envelope and request ID

#### Scenario: Verifier infrastructure failure
- **WHEN** Firebase fails for an unexpected operational reason
- **THEN** the API handles it as a server failure without returning token or provider details
