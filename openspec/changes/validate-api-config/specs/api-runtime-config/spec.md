## ADDED Requirements

### Requirement: Validate API configuration at startup

The API SHALL validate its port, execution mode, canonical API prefix and frontend origin before serving requests. Validation errors SHALL identify the setting without printing its value.

#### Scenario: Local development

- **WHEN** the API starts locally
- **THEN** runtime variables take precedence over apps/api/.env and then the workspace .env, with defaults of port 4000, prefix /api/v1 and origin http://localhost:3000

#### Scenario: Production startup

- **WHEN** NODE_ENV is production
- **THEN** the API uses runtime variables and requires an explicit HTTPS frontend origin

#### Scenario: Invalid configuration

- **WHEN** a supplied port lies outside 1–65535, the mode is unsupported, the origin is malformed or the prefix differs from /api/v1
- **THEN** startup fails before listening
