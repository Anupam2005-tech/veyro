## ADDED Requirements

### Requirement: Calculate the Release 1 hourly base fare

Quote estimates SHALL use route minutes. Final base fare SHALL use the full elapsed time between verified start and end timestamps and the frozen hourly rate. The calculation SHALL reject disabled pricing modes and invalid numbers.

#### Scenario: Short completed trip

- **WHEN** a trip lasts 90 seconds at a frozen rate of INR 300 per hour
- **THEN** the base fare is INR 7.50 and its whole-rupee display value is INR 8

#### Scenario: Zero usage

- **WHEN** estimated or actual elapsed time is zero
- **THEN** the base fare is zero without a minimum charge

#### Scenario: Unsupported mode

- **WHEN** the server is asked to calculate a PER_KM fare for Release 1
- **THEN** it rejects the calculation
