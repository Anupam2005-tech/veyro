## Why

The API imports types published by the contracts workspace. Building the API alone failed with TS2307 when the contracts declarations were absent.

## What Changes

Declare the contracts TypeScript project as a dependency of the API build. Verify the existing Express entry points through the compiled server.

## Capabilities

### New Capabilities

- `api-scaffold` covers building and starting the API independently.

## Impact

BE-FND-001 affects the local API build and uses the existing shared contracts package and HTTP routes.
