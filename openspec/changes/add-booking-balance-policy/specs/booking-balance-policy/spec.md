## ADDED Requirements

### Requirement: Exclude charges under active dispute from the booking gate

The booking balance policy SHALL block on a positive confirmed unpaid amount outside active dispute.

#### Scenario: Both disputed and undisputed amounts exist

- **WHEN** a customer has an active dispute and a separate confirmed unpaid charge
- **THEN** the latter blocks a new booking

#### Scenario: The only unpaid amount is under active dispute

- **WHEN** every positive confirmed unpaid amount is currently under active dispute
- **THEN** the balance policy does not block the booking
