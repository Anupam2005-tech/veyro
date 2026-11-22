## Why

BE-FND-009 establishes request validation for the Team 2 API.

## What Changes

The API SHALL provide express-validator middleware that passes valid requests to their controller and forwards invalid requests to the global error handler with status 400.

## Impact

Valid sanitized input and multiple invalid fields verified through a test route.
