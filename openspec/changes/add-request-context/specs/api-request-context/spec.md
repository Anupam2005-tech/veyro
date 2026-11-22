## ADDED Requirements

### Requirement: HTTP request correlation
The API SHALL attach one ID to the Express request and the X-Request-Id response header before CORS or body parsing. When an API envelope is returned, meta.requestId SHALL match that header.

#### Scenario: Client supplies a valid ID
- **WHEN** the incoming ID contains 1 to 128 ASCII letters, digits, dots, underscores or hyphens
- **THEN** the API preserves that ID

#### Scenario: Missing or invalid ID
- **WHEN** the incoming ID is absent, malformed, or contains multiple comma-separated values
- **THEN** the API generates a fresh UUID-based ID for the request

#### Scenario: Preflight
- **WHEN** CORS handles an OPTIONS request before routing
- **THEN** the response still carries the request ID
