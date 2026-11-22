## ADDED Requirements

### Requirement: Interactive API contract
The API SHALL serve local Swagger UI assets and the canonical OpenAPI document only with explicit non-production opt-in.

#### Scenario: Interactive API contract in use
- **WHEN** a developer enables ENABLE_API_DOCS locally
- **THEN** Swagger UI loads the contract with the public health operation; production keeps the documentation routes disabled
