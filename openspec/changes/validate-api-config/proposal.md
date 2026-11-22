## Why

The standalone API silently selected port 4000 for malformed input and the application accepted an unchecked frontend origin.

## What Changes

Load and validate the active HTTP settings centrally before creating the Express app. Local development supports the API environment file and workspace .env template. Production uses runtime settings and requires an explicit HTTPS frontend origin.

## Capabilities

### New Capabilities

- `api-runtime-config` defines configuration for the API scaffold.

## Impact

BE-FND-002 covers the standalone server and Express factory, the API environment example and startup tests.
