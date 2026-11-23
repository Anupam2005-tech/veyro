## Why
Frontend screens exist, but live requests still use obsolete paths and demo DTOs. Silent demo fallback masks authentication, authorization, provider and persistence failures. Private uploads bypass the server workflow, and realtime updates/payment verification are incomplete.

## What Changes
Align FE-014–042 and FE-047–054 with canonical backend contracts. Add scoped read models where screens need joined booking/trip/Admin data; validate profile updates and preserve vehicle ownership. Send limited-use App Check tokens, proxy private uploads, poll live state, relay foreground GPS, and integrate Test Mode checkout with server verification. Retain explicit demo previews and explicitly held OTP display/recovery policies.

## Impact
Web API adapters, onboarding/booking/trip/Admin screens, protected backend read models and profile saves, FE-043–046 verification, OpenAPI and progress tracking. No deployment or external messages/payment capture is performed by this task.
