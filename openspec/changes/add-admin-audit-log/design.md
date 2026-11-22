## Context

T2-P1 starts with BE-029. The Unified Specification names the `adminAuditLogs` collection and its fields. The backend specification places audit history in Firestore and requires explicit authorization for privileged SDK operations. The current API has no shared Firebase Admin client or verified request identity.

## Goals / Non-Goals

- Record each successful sensitive Admin mutation and its audit entry together.
- Keep the audit module internal. Admin endpoints, application scoring, account-control policy, shared response types, and retention changes are outside BE-029.

## Decisions

- The internal implementation is under `apps/api/src/modules/audit/`, with focused tests under `apps/api/test/`. The service accepts a server-supplied actor with a UID and roles, plus a Firestore-compatible store and transaction. Wire these to Anupam's verified identity and shared client when available.
- Use the documented fields `adminId`, `action`, `entityType`, `entityId`, `before`, `after`, `reason`, and `createdAt`. Take the actor from verified server identity and derive the timestamp and state changes on the server. Store only the fields needed to describe the change.
- The repository writes a new audit record in the caller's Firestore transaction. A failure aborts both writes. The audit module exposes no update or delete operation.
- Integration with application, driver, and customer mutations belongs to BE-030–032. Those tasks depend on the corresponding Team 1 interfaces.

## Risks / Trade-offs

- BE-001 and the shared Firebase Admin client are pending. Wiring a substitute identity or data client now would create competing interfaces.
- Raw profile or document snapshots can contain private data. Audit records should contain the relevant state values and identifiers.
