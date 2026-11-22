## Why

A service worker installed during production use can continue controlling a development origin. Cache-first Next.js assets can then load modules from different builds, producing a webpack factory error during hydration. The supplied error was absent in a fresh browser, so the original failure remains a likely stale-session issue.

## What Changes

Unregister the Veyro worker and delete Veyro shell caches in development. Fetch assets from the network first with cache fallback on network failure. Bump the production cache generation and restrict activation cleanup to Veyro caches.

## Impact

Web PWA registration and service worker asset delivery.
