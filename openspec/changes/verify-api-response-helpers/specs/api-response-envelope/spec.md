## ADDED Requirements

### Requirement: Canonical HTTP envelopes
The response helpers SHALL preserve the selected HTTP status, include the request context ID in JSON metadata and include pagination only when supplied.

#### Scenario: Successful response with a body
- **WHEN** a route sends a successful JSON response
- **THEN** the response contains success, message, data and meta, with null data when the payload is absent

#### Scenario: No content
- **WHEN** a route selects status 204
- **THEN** the response body is empty

#### Scenario: Failed response
- **WHEN** a route sends a failure
- **THEN** the response contains success set to false, a message, metadata and an error with a stable code and a details array containing only public messages and optional field names
