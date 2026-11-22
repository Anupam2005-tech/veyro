## Why

The API returned the configured origin header even to requests from other origins. Browsers reject a mismatched header, but the API should grant CORS explicitly only on an exact match.

## What Changes

Match incoming origins against the validated FRONTEND_ORIGIN on actual and preflight requests.

## Impact

The existing single-origin configuration, local default and production HTTPS requirement continue to apply. Server-to-server requests can still reach the API.
