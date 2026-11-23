## Cross-team backend execution — 23 November 2026

| Task | Implementation | Verification / remaining dependency |
|---|---|---|
| BE-005 | Own customer profile/onboarding and consent, deletion-request intake | Physical account/data deletion awaits approved retention rules |
| BE-006 | Server-created owned vehicles, update/delete and active-booking protection | Frontend must use the documented backend IDs/DTOs |
| BE-007 | Driver profile/rates/capabilities and a private-coordinate-free online directory | Capability/identity/area changes require manual review |
| BE-008 | Verified document submission, pending/rejected/resubmission flow | Manual approval remains authoritative |
| BE-009 | Private backend-proxied uploads, signature/size checks, owner/generation records and Admin download | Actual cloud Storage/IAM still needs release verification |
| BE-010 | Online/offline leases, road-route producer and compatibility/eligibility producer | Approved service-area bounds and Maps server key are required |
| BE-019 | Assigned-driver GPS, freshness/order/jump checks, Firestore latest sample and RTDB relay | Actual device/GPS calibration remains pending |
| BE-020 | Random hash-only shares, authenticated minimal view, owner revocation and automatic end-of-trip denial | Frontend link/token-header integration remains |
| BE-036 | Terminal trip cleanup and periodic stale presence/location cleanup | Deploy functions and verify managed invocation |
| INF-002 | Backend-only RTDB deny-all client policy | Anonymous direct reads and privileged scoped operations covered locally |
| BE-011–014 | Eligibility refresh for stored scheduled routes and strict pickup/quote binding | Actual road provider and UI integration remain release checks |
| BE-040 | Cross-owner profiles, private uploads, share auth/revocation and RTDB denial checks | Final suite result recorded below |

- [x] Build API/Functions and generated deployment package.
- [x] Record final full Node22 emulator suite: 74 passed, zero failures/skips, with Auth, Firestore, Storage and RTDB.
- [x] Refresh OpenAPI and backend tracker; Graphify AST graph refreshed.
- [ ] Verify live Maps, device GPS and deployed Storage/RTDB/Functions.
- [x] Complete frontend canonical endpoint/DTO migration and remove unintended live-to-demo fallbacks; see ../complete-frontend-integration/tasks.md.


## Follow-up security checks

- [x] Application compatibility URLs use verified-upload/state validation instead of browser metadata.
- [x] Concurrent/repeated submissions retain one pending application and preserve server profile fields.
- [x] Approved applications cannot be reset by the resubmission URL.
- [x] Orphaned trip location cleanup removes coordinates and writes an RTDB disabled fence.
- [x] Private uploads require a numeric immutable object generation.
- [x] Immediate eligibility and transactional acceptance reject scheduled trips still active beyond their estimated end.

## Final verification — 23 November 2026

| Check | Result |
|---|---|
| API/Functions build | Deployment packaging script compiles both and emits standalone Node22 artifact |
| API/Functions type-check | Passed with local TypeScript compiler |
| Full backend regression | 74 passed; 0 failed, skipped or cancelled under Node v22.23.5 |
| Emulator coverage | Auth, Firestore, Storage and RTDB; synthetic records and deterministic road provider |
| Functions startup | Eight handlers loaded; packaged HTTP health returned 200 under Node22 |
| Scheduled cloud handlers | Worker logic tested; actual managed invocation remains pending |
| OpenSpec | All 24 changes pass strict validation |
| Graphify | AST graph refreshed successfully; concurrent workspace edits may change node counts |
| Whitespace | Backend/docs/config tracked diff check passed |
| Codebase-memory MCP | Transport unavailable on final refresh; Graphify CLI completed successfully |
| Review / Git | Independent review pending; no commit, push or deployment performed |

Reproduce with Node22 after building the deployment artifact:

```sh
firebase emulators:exec --only auth,firestore,storage,database --project demo-veyro-audit 'node --test --test-concurrency=1 --test-reporter=tap apps/api/test/*.test.cjs'
```
