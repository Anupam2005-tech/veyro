## Why

The web session needs a durable profile for the verified UID, role enforcement and App Check replay protection.

## What Changes

Add role middleware, transactional session bootstrap and consumption of limited-use App Check tokens.

## Impact

The session operation reads Firebase Auth and uses backend-only users documents. Team 1 must supply a fresh App Check token on every session request. The deployed runtime must have the App Check token verifier permission.
