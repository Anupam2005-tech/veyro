## Why

Protected Veyro routes need the Firebase UID of the caller before checking product roles or resource ownership.

## What Changes

Add opt-in Express authentication middleware backed by the shared Firebase Admin application. Verify ID tokens with revocation checks and expose the verified UID through typed request context.

## Impact

Protected route owners mount authenticate before authorization and controllers. The existing health endpoint remains public. BE-002 owns role checks and BE-003 owns session bootstrap.
