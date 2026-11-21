## Why

BE-011 and BE-042 need the same hourly calculation for quote estimates and final trip base fare. The calculation can be verified with fixtures before identity, routing, and trip interfaces are available.

## What Changes

- Calculate the estimated base fare from route minutes and the final base fare from elapsed OTP timestamps using the server-selected hourly rate.
- Keep actual-usage amounts distinct from INR display rounding. Reject disabled pricing modes and invalid numbers.
- Verify the calculation against short, zero-length, and fractional trips.

## Capabilities

### New Capabilities

- `hourly-fare-calculation` covers the internal hourly base fare calculation.

### Modified Capabilities

None.

## Impact

API quotes module and focused tests. Existing API paths, DTOs, frontend routes, and dependencies stay in place. Quote persistence, rate selection and trip/fee integration require the assigned handoffs.
