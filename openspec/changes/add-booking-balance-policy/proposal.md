## Why

BE-024 needs a server-side rule to decide whether an outstanding fare blocks a new booking.

## What Changes

Detect confirmed unpaid amounts while excluding active disputes.

## Capabilities

### New Capabilities

- `booking-balance-policy`: computes the balance gate from verified ledger facts.

### Modified Capabilities

None.

## Impact

Internal payments module only. Booking transaction wiring remains a handoff.
