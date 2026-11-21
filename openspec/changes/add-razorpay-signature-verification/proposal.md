## Why

BE-022 needs verified provider signatures before Veyro trusts a checkout result or webhook.

## What Changes

Verify checkout with the server-stored order ID and verify webhooks against the original request bytes.

## Capabilities

### New Capabilities

- `razorpay-signature-verification`: internal checkout and webhook signature verification.

### Modified Capabilities

None.

## Impact

Payments module and tests. No network calls or external routes are added by this change. Payment order creation, raw request wiring and durable payment transitions require upstream integration.
