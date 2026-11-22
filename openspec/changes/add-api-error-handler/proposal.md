## Why

Express parser failures need the same safe response format as route failures.

## What Changes

Add a public AppError type, a missing-route subclass and one final Express error handler. Attach existing request context before parsing JSON.

## Impact

API clients receive stable error codes and a request ID even for invalid JSON. Missing-route messages omit the requested URL.
