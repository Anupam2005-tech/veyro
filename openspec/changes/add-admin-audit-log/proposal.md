## Why

Admin application decisions and account controls need a durable record of who changed what, when, and why. BE-029 provides the append-only audit foundation for those later tasks.

## What Changes

- Record sensitive Admin actions in the documented Firestore collection `adminAuditLogs`.
- Require a verified Admin identity, a reason, and a server-generated timestamp for each entry.
- Verify that denied actions produce no entry and that a failed audit write cannot leave a successful Admin state change.

## Capabilities

### New Capabilities

- `admin-audit-log` records sensitive Admin actions with create-only audit entries.

### Modified Capabilities

None.

## Impact

BE-029 is scoped to the API audit module and its tests. The existing Admin and HTTP contracts, frontend routes, and dependencies stay in place. BE-001 and the shared Firebase Admin integration provide identity and Firestore access. BE-030–032 are consumers in later tasks.
