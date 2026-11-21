## ADDED Requirements

### Requirement: Preserve reporter privacy

Only the verified reporter and Admin SHALL be eligible to read a report detail. A resolution SHALL require a note and provide only the reporter as a notification recipient.

#### Scenario: Reported user requests the report

- **WHEN** the reported user is neither reporter nor Admin
- **THEN** report detail access is denied

### Requirement: Prepare demo-only SOS

The demo SOS rule SHALL require the verified trip customer and SHALL report that no external alert was sent.

#### Scenario: Demo event is prepared

- **WHEN** a verified customer requests simulated SOS for their own trip
- **THEN** the event is prepared with no external delivery attempts

### Requirement: Count distinct qualifying incidents

The suspension threshold SHALL be reached on the fifth distinct qualifying incident within the already-approved window.

#### Scenario: One incident is delivered twice

- **WHEN** four distinct qualifying incidents are supplied with one duplicate
- **THEN** the threshold is not reached
