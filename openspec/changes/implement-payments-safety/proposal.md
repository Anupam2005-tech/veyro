## Why

Payment and safety helpers need durable transactions and authorized HTTP entry points before release integration.

## What Changes

Implement Test Mode orders, callback verification, raw webhook verification and deduplication, captured payment receipts, booking balance enforcement, private reports, Demo SOS, verified incident suspension, inbox/push delivery and transactional Admin report audits.

## Impact

BE-021 through BE-029 and report resolution. Existing identity middleware protects client routes. Firebase Functions gains notification and verified-incident processing. API package exports repair its unresolved import. Payable, trip and verified incident producers remain upstream dependencies. External integrations and deployment require separate verification.
