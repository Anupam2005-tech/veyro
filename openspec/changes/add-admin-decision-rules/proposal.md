## Why

BE-030–032 need consistent validation for manual driver application review and account controls.

## What Changes

- Validate documented manual decisions and their audit reasons before creating updates.
- Validate driver deactivation/restoration and restoration of suspended customers.

## Capabilities

### New Capabilities

- `admin-decision-rules` defines the internal manual decision and account transition rules.

### Modified Capabilities

None.

## Impact

Internal Admin module and tests. HTTP routes, identity, persistence, and frontend remain integration work.
