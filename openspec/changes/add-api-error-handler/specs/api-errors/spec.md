## ADDED Requirements

### Requirement: Safe API error responses
The API SHALL serialize public application errors with their status, stable code, safe message and field details in the standard error envelope.

#### Scenario: Route missing
- **WHEN** no route matches
- **THEN** the API returns 404 and ROUTE_NOT_FOUND without echoing the URL

#### Scenario: Body rejected
- **WHEN** Express rejects malformed JSON or an oversized body
- **THEN** the API returns 400 or 413 respectively with a request ID and a safe error message

#### Scenario: Unexpected error
- **WHEN** middleware forwards an unexpected error before sending headers
- **THEN** the API logs the failure and returns a generic 500 without exposing exception details

#### Scenario: Response already started
- **WHEN** headers have already been sent
- **THEN** the handler delegates to Express without attempting a second response
