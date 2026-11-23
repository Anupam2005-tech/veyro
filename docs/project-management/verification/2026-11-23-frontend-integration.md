# Frontend/backend integration verification — 23 November 2026

Source remains REVIEW pending independent review and merge. This report supersedes the earlier demo-only frontend handoff notes.

| Check | Observed result |
|---|---|
| Backend | 86 tests passed, 0 failed/skipped/cancelled, Node22.23.5; Auth/Firestore/Storage/RTDB emulators with explicit default database |
| Frontend | 15 contract/worker tests passed; no live fallback, server amounts and states, private files/shares, current Places, marker lifecycle, interrupted initialization and push fallback/privacy |
| Build/type/lint | API/Functions package and explicit demo/live web production builds pass; web/shared UI/API/Functions types pass; web ESLint has no warnings/errors |
| Initial route JS | Maximum 200 kB in the final production preview, below the 220 kB initial-route target; deferred provider chunks excluded; real-device LCP unmeasured |
| Main browser matrix | 24 routes × 320/390/768/1440px = 96 checks; no runtime exception, horizontal overflow, unexpected redirect or unnamed visible button |
| Latest-build follow-up | 12 affected routes × 390/768px = 24 checks, all passed |
| Keyboard / synthetic workflow | Dialog focus trap, Escape/focus return, keyboard place selection, instant search, quote and booking confirmation passed |
| Functions runtime | All eight handlers load; generated package serves health HTTP200 through Functions emulator under Node22.23.5 |
| OpenSpec / Graphify | All 25 changes passed strict validation; AST code graph refreshed; semantic document extraction not rerun |
| OpenAPI | 80 paths parse successfully; API docs and frontend adapters aligned |
| Live side effects | No real notification sent, payment captured, cloud deployment, Git commit or push performed |

Browser verification used an isolated explicit demo build and synthetic local accounts. Live transport behavior is covered separately through frontend contract tests and protected emulator HTTP tests. This is not evidence of live provider/device performance or a full screen-reader audit.

## Reproduction

Use Node22 or newer locally. The Functions deployment artifact declares Node22.

```sh
node scripts/package-functions.cjs
FIRESTORE_DATABASE_ID='(default)' firebase emulators:exec --only auth,firestore,storage,database --project demo-veyro-audit 'node --test --test-concurrency=1 --test-reporter=tap apps/api/test/*.test.cjs'
node apps/web/test/live-integration.test.cjs
node apps/web/node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json
```

From apps/web, run lint/build with the local Next CLI:

```sh
node node_modules/next/dist/bin/next lint
NEXT_PUBLIC_VEYRO_DEMO_MODE=true VEYRO_NEXT_DIST_DIR=.next-review node node_modules/next/dist/bin/next build
VEYRO_NEXT_DIST_DIR=.next-review node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100
```

For browser checks, run an isolated Chrome debugging profile on localhost:9223, then run node scripts/check-frontend-browser.cjs and node scripts/check-frontend-flows.cjs from the repository root. These scripts seed synthetic data only on the local preview origin. Their JSON/log/screenshot outputs are saved under /tmp/veyro-frontend-browser-review.

## Remaining release gates

| Gate | Status / owner |
|---|---|
| Secure customer OTP display/delivery/recovery | Explicit owner hold; live UI shows unavailable setup |
| Lead Firebase UID | Owner will supply later |
| Incident qualification, no-trip disputes, allocations/refund/settlement | Explicit owner-held policies |
| Maps and device GPS | Configured browser/server keys, Places New/Routes APIs, restrictions/quotas and physical-device calibration |
| Captured Test Mode payment/webhook | Actual approved checkout exercise and webhook configuration |
| FCM/App Check | Public VAPID key, real test device, token consumption and actual delivery check |
| Deployment | Configured named database rules/indexes, Functions/App Hosting/IAM/secrets and managed schedules |
| Human review | Sid/Nishan frontend, Pritam backend financial/auth, Bipul/Pranesh Maps/GPS; screen reader and representative Android/4G LCP |

No release gate above is marked complete by local build or emulator success.
