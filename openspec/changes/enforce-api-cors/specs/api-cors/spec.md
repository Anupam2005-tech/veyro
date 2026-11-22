## ADDED Requirements

### Requirement: Exact frontend origin
The API SHALL grant credentialed CORS access only to the configured frontend origin and vary responses by Origin.

#### Scenario: Matching actual request or preflight
- **WHEN** the request origin matches the configured frontend
- **THEN** the response grants that exact origin and supports credentialed requests

#### Scenario: Other origin or no origin
- **WHEN** a request has another origin, a null origin or no origin header
- **THEN** the API omits Access-Control-Allow-Origin, including on preflight responses
