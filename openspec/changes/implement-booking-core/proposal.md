## Why

BE-011 previously calculated a quote only in memory. BE-012 through BE-015 require durable booking state shared by retries, concurrent drivers and deadline jobs.

## What Changes

Persist server-built hourly snapshots and add internal Firestore operations for creation, addressed offers, assignment, scheduled deadlines and cancellation. Use the confirmed scheduled timing and NEEDS_REBOOK recovery in the current booking specification. Record events and cancellation facts transactionally.

## Impact

Pritam retains quote pricing ownership. Identity, authoritative quote inputs, account balance, driver eligibility, availability, approved cancellation reasons and trip facts are integration dependencies. No public route accepts these facts from a client. BookingChecks requires non-optional transaction-aware implementations before routes are mounted. Scheduled workers call advance and offerScheduled; Team 3 consumes the resulting durable records for delivery. Those integrations remain pending. Trip completion must release its reservation when that module is integrated.
