## ADDED Requirements

### Requirement: Public API liveness
The public health route SHALL return a non-cacheable 200 JSON response containing only the service name, version, UP status, timestamp and standard response envelope.

#### Scenario: Public API liveness in use
- **WHEN** a client checks GET /api/v1/health without credentials
- **THEN** it receives current liveness data with the request ID and Cache-Control set to no-store
