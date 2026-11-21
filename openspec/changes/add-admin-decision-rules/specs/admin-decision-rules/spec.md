## ADDED Requirements

### Requirement: Validate manual application decisions

Manual review SHALL act on pending applications and require an audit reason. A request for changes SHALL include at least one nonblank item.

#### Scenario: Return an incomplete application

- **WHEN** a pending application is manually returned with a reason and correction list
- **THEN** its next status is NEEDS_CHANGES

#### Scenario: Reject a stale decision

- **WHEN** the application has already left PENDING_REVIEW
- **THEN** the attempted decision is rejected

### Requirement: Validate Admin account controls

Admin account controls SHALL require an audit reason and preserve independent suspension and incident data when changing driver approval or restoring a customer.

#### Scenario: Restore a deactivated driver

- **WHEN** an Admin restores a DEACTIVATED driver with a reason
- **THEN** the approval status becomes APPROVED and separate suspension data is preserved
