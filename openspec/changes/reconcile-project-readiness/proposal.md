## Why

Veyro's product/backend documents, API examples and five-member trackers conflict with the owner's adopted three-part Working Decision Baseline received on 14 November 2026. Reconcile the documentation before foundation repair so Codex, Antigravity and Cursor implement the same reviewed requirements.

## What Changes

- Record the complete working baseline and its provenance, distinguishing established decisions, newly adopted working decisions, technical verification and explicitly deferred work.
- **BREAKING (documented contract only):** reconcile the nine canonical API paths, booking states, multi-role identity and response envelope; identify subsequent source changes without performing them.
- Replace manual-only driver approval text with score-based approval plus hard stops and Admin review; preserve the recommended rubric as a recommendation where specified.
- Reconcile scheduled timing/rate acceptance, four location phases, rolling incident window, disputes, OTP/pickup/overlap/document rules and retention limits.
- Replace obsolete five-person allocations with the already-approved M1–M7 structure and reconcile tracker claims against evidence.
- Describe a shared OpenSpec proposal/review workflow and the documentation approval gate before foundation repair.
- List unresolved semantics explicitly rather than inventing policy, technical support or verification results.

## Capabilities

### New Capabilities

- `documentation-consistency`: Reviewable documentation, contract and tracker reconciliation against the owner baseline, including acceptance scenarios and change boundaries.

### Modified Capabilities

None. `openspec/specs/` contains no existing capability specifications. The new delta describes documentation obligations, not implemented application behaviour.

## Impact

Only the documentation allowlist in `design.md` may be changed after explicit owner approval. Product authority stays in `docs/veyro.md`; engineering conventions stay in `docs/veyro_backend.md`; the future backend OpenAPI document owns API syntax/contracts and the Unified Specification references it consistently.

Affected future UI routes include `/auth`, `/onboarding/customer`, `/onboarding/driver`, `/customer`, `/customer/trips/[id]`, `/driver`, `/driver/status`, `/driver/trips/[id]`, `/admin/applications/[id]` and `/share/[token]`. Affected future API modules include auth, customers/vehicles, drivers/applications/availability, quotes/bookings/trips, payments, reports, sharing, notifications, Admin and audit. No code in those routes/modules changes here.

No package, lockfile, runtime, configuration, Firebase rule, agent integration, cloud resource or generated graph changes are included. No installs, upgrades, deployment, provisioning, real data or live payments. Proposal preparation is authorized; application remains unauthorized. Passing OpenSpec artifact validation does not grant owner approval or establish technical compatibility.
