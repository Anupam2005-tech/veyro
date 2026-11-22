## ADDED Requirements

### Requirement: Authenticate Razorpay payloads

The payment module SHALL verify checkout callbacks against the server-stored order ID and SHALL verify webhooks against the original raw request bytes before parsing.

#### Scenario: Callback supplies a different order

- **WHEN** the callback names a different order than the stored order
- **THEN** signature verification fails

#### Scenario: Webhook bytes change after signing

- **WHEN** bytes in the webhook payload differ from the original signed content
- **THEN** verification fails even if the decoded JSON would be equivalent
