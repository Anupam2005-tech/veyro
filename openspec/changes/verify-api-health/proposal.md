## Why

BE-FND-008 establishes public api liveness for the Team 2 API.

## What Changes

The public health route SHALL return a non-cacheable 200 JSON response containing only the service name, version, UP status, timestamp and standard response envelope.

## Impact

Existing health payload preserved and cache prevention verified over HTTP.
