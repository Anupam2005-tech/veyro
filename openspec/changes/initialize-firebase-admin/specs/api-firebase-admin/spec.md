## ADDED Requirements

### Requirement: Shared Firebase Admin application

The API SHALL initialize or reuse the default Firebase Admin application at startup using the SDK credential chain.

#### Scenario: Repeated startup
- **WHEN** multiple API instances start in one process containing a named Firebase app
- **THEN** they share one default Admin app and preserve the named app

#### Scenario: Managed runtime
- **WHEN** the runtime provides FIREBASE_CONFIG
- **THEN** the SDK uses the managed Firebase options

#### Scenario: Local startup
- **WHEN** managed configuration is absent and local Firebase project settings are supplied
- **THEN** the default application uses the supplied settings
