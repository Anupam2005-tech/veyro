## Context

Unified specification sections 5.14 and 11 describe the manual application state transitions and driver/customer account controls. Baseline D01 addresses automatic approval separately.

## Decisions

Pure decision functions accept current state from a future trusted transaction. They validate action, reason and change items and produce the documented next state. These functions make no persistence changes. Approval, suspension and incident history stay separate.

## Risks / Trade-offs

Production routes require Anupam's identity and shared Firestore interfaces, Team 1 application/profile/document contracts and the audit write in the same transaction. Automatic scoring awaits U04.
