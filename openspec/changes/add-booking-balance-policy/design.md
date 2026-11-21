## Context

Unified section 5.8 blocks new bookings on confirmed unpaid balances. Section 5.5 excludes charges actively under dispute.

## Decisions

Evaluate confirmed unpaid amounts provided by the customer-scoped ledger. Return whether any remaining positive amount blocks booking. The booking transaction must later evaluate this policy against the authoritative ledger atomically. Settlement and dispute qualification remain outside this function.
