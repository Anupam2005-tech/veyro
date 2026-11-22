## Why

Clients and backend handlers need one correlation ID for each HTTP request, including parser failures and preflight requests.

## What Changes

Replace inline ID assignment with typed middleware before CORS and parsing. Preserve short client IDs, generate a UUID-based fallback, and expose the response header to browser clients.

## Impact

All API routes share request context. Existing success and error envelopes keep meta.requestId.
