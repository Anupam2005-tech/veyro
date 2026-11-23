## Why

Booking still depends on missing profile, vehicle, driver, upload, availability, route and GPS producers. Sharing and location cleanup also require implementation.

## What Changes

Add owner-scoped profile and vehicle operations, driver profile/application submission, backend-proxied private uploads and authorized Admin document downloads. Add road routing, eligibility, availability, trip GPS, authenticated hash-only sharing and location cleanup functions.

## Impact

BE-005–010, BE-019–020, BE-036, INF-002 and their booking/security integration. The current request authorizes work across the original team scopes. Existing owner-held OTP display, lead UID and commercial/incident policies remain pending.
