# Team 3 — Realtime field notes (for Dip's report)

Scope: Maps, GPS, presence/availability, notifications, trip sharing.
Code: `apps/api/src/modules/availability|trips|share-links|notifications`,
`functions/src/team3.ts`, `apps/web/src/maps`, `infra/firebase/database.rules.json`.

## What to capture on a real device (Android + mobile data)

- [ ] GPS permission prompt → granted / denied / prompt states
- [ ] Online toggle with stale GPS (>30s) — expect amber banner + frozen marker
- [ ] Foreground location cadence (5–10s) + `Last updated at [time]`
- [ ] Offer receive → accept/reject with 5-min expiry (needs Team 2 booking)
- [ ] Trip share link: signed-out redirect to `/auth`, authenticated view, revoke
- [ ] Notification permission denied → in-app fallback (never fake SENT)
- [ ] Maps load time, route bundle size, PWA install prompt

## Boundaries (do not claim)

- No continuous background tracking from the PWA.
- No live payment, no external SMS dispatch (Demo SOS only).
- RTDB holds ephemeral presence/location only; Firestore owns truth.
- Delivery failure never rolls back a valid booking or payment.
