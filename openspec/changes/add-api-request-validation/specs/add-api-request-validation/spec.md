## ADDED Requirements

### Requirement: Request validation
The API SHALL provide express-validator middleware that passes valid requests to their controller and forwards invalid requests to the global error handler with status 400.

#### Scenario: Request validation in use
- **WHEN** multiple route validation chains reject input
- **THEN** the controller is skipped and VALIDATION_ERROR includes field messages and request metadata without rejected values
