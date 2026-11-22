## Context

Razorpay signs checkout confirmation with its API key secret and signs webhook requests with the configured webhook secret. These are distinct inputs.

## Decisions

Use Node crypto HMAC-SHA256 with constant-time digest comparison. Validate callback order IDs against the stored order before computing the signature. Accept original webhook bytes only. Signed callbacks do not mark an invoice paid. Verified event IDs, amount/currency checks, capture and idempotency belong to the integrated order and transaction paths.

## References

- [Razorpay checkout integration](https://razorpay.com/docs/server-integration/python/test-app/)
- [Razorpay raw webhook signature verification](https://razorpay.com/blog/payment-gateway-webhooks-india/)
