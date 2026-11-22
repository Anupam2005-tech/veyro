## Why

The existing response helpers could omit data on success and serialize raw values attached to field errors. The shared type also allowed errors without a details array.

## What Changes

Align serialization and shared HTTP types with the common response contract and verify both helpers over HTTP.

## Impact

API and shared HTTP contracts. Existing routes keep their status codes and request IDs.
