## Why

The API needs one default Firebase Admin app that later identity and persistence tasks can share.

## What Changes

Initialize the default Admin app during API startup and reuse it across app factories. Use managed Firebase configuration in Functions and support explicit local project settings.

## Impact

The API takes a direct dependency on the same Admin SDK version as Functions. Startup does not require a Firebase network request.
