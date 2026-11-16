# Application checklist — blocked pending explicit owner approval

All tasks below are future documentation work. No checkbox is complete merely because this proposal exists or validates. Use design.md's13-file allowlist; never repair source/config while reconciling descriptions. Existing task IDs below are cross-references, not claims those implementation tasks are completed.

## 1. Authority and adopted decisions (R05, R08)

- [ ] 1.1 [FND-002; M6, reviewer M7] Confirm explicit owner application approval and unchanged scope; record baseline provenance/classification in `docs/working-decision-baseline.md`; verify all D01–D11/R06/R07/R10/P01 and fixed decisions are covered.
- [ ] 1.2 [BE-008, BE-030; M4, reviewer M7] Reconcile driver scoring/manual-review text throughout `docs/veyro.md` and `docs/veyro_backend.md`; preserve recommended rubric label, hard stops, no AI-only decisions, audit and no external-verification fiction; keep U04 unresolved where necessary.
- [ ] 1.3 [BE-014, BE-015, BE-017, BE-027; M6, reviewer M7] Reconcile scheduled timing/rate cap, UNFULFILLED, rolling12mo incidents, exceptions, fees, evidence and restoration; explicitly record U01/U02/U05 rather than selecting behaviour.
- [ ] 1.4 [BE-018, BE-009; M4, reviewer M6] Reconcile OTP5min/5attempts/60s, pickup-before-arrival acceptance, overlap30min buffer, JPEG/PNG/PDF10MB and re-verification in both specs; flag U10.
- [ ] 1.5 [BE-019, BE-020, INF-002; M3, reviewer M5] Reconcile four-phase location access, sharing, offline/completion/cancellation deletion and24h fallback; preserve evidence/retention questions and document no unrestricted Admin access.
- [ ] 1.6 [BE-002, BE-003, BE-004; M5, reviewer M4] Reconcile Customer+Driver roles per UID, lead-granted Admin, provider linking/recovery and App Check/server-to-server boundaries in both specs.
- [ ] 1.7 [BE-025, BE-024; M7, reviewer M6] Reconcile48h dispute/seven-day target, no complaint-triggered financial adjustment, audited adjustment reasons, retention restrictions and synthetic-only development; leave no-trip dispute timing and settlement mechanics explicit.

## 2. Contracts schemas and scenarios (R06, R07, R10)

- [ ] 2.1 [BE-FND-010; M6, reviewers M2/M4] Add `docs/api-contracts.md` and documentation-only `apps/api/docs/openapi.yaml` using exactly the nine adopted routes. Reconcile both specs' API examples; distinguish resolved syntax from unapproved methods/payloads; do not generate code or install validators.
- [ ] 2.2 [BE-FND-005, BE-FND-006; M6, reviewer M5] Align response documentation to optional success meta, error request ID, JSON/no204, early tracing and global errors; mark U06 fields unresolved; leave actual shared types/source unchanged.
- [ ] 2.3 [BE-012, BE-016, INF-004; M6, reviewers M3/M7] Add `docs/data-model.md` with UID ownership, stable IDs, field types, protected fields, atomic assignment, indexes/transactions and canonical booking states; record category and state-edge blockers; do not modify index/rule files.
- [ ] 2.4 [FE-021, FE-031; M2, reviewer M1] Reconcile Standard/Premium/Luxury, deferred ratings/favourites and canonical state names across product screens/prompts; do not invent body-style mapping.
- [ ] 2.5 [BE-038, BE-039, BE-040, FE-043; M7, reviewers M1/M3/M5] Add `docs/test-plan.md` with all design.md boundary/security/race scenarios, explicit expected results where decided and decision dependencies elsewhere; no executable tests in this change.

## 3. Team trackers workflow and technical caveats (R14–R16, R11–R13)

- [ ] 3.1 [FND-003; M4, reviewers all] Reconcile Unified §12 and add `docs/project-management/TEAM_RESPONSIBILITIES.md` with approved M1–M7 owners, interfaces/reviewers and distributed jobs/security/CI work; names remain pending; sole Owner stays project lead.
- [ ] 3.2 [FND-004–FND-018; M2, reviewers M1/M4/M5/M6/M7] Update all three `docs/project-management/` trackers against actual file/evidence status, preserving IDs, adding remediation mappings, separating partial scaffold from tested DONE, and marking unresolved/provisioning dependencies.
- [ ] 3.3 [FND-002; M1, reviewer M4] Correct all eight obsolete team-size references and branch/demo wording in README/specs; preserve unrelated five-minute/fifth-incident numeric policy.
- [ ] 3.4 [FND-002, INF-006, INF-007; M1, reviewers M3/M5] Document current-vs-target runtime and recommended Mumbai/Singapore/verified-RTDB regional direction in README/specs/trackers; record actual build/region verification as pending. Flag missing web env template and dotenv mismatch; do not claim setup fixed or change packages/config/source.
- [ ] 3.5 [FND-015; M1, reviewer M5] Add `docs/ai-development-workflow.md` describing shared OpenSpec authority/review gates, installed1.3.1 absolute-path invocation, adapter gaps and graph absence; do not update `openspec/config.yaml`, agent adapters or generate graph output.
- [ ] 3.6 [BE-012, FE-020; M2, reviewers M4/M6/M7] Document first instant-booking milestone dependencies, cross-member acceptance and exclusions in status/test documents; clearly separate documentation, foundation repair and actual Release1 completion.

## 4. Documentation verification and owner review

- [ ] 4.1 [FND-015; M6, reviewer M1] Run installed CLI strict change validation plus `git diff --check`, tracked/untracked path review and Markdown link checks; report unavailable OpenAPI validator rather than install one or claim validation passed.
- [ ] 4.2 [BE-FND-010; M6, reviewers M2/M4/M5/M7] Review canonical paths, states, response shapes and OpenAPI/Unified authority links; classify unresolved fields; do not present a partial contract as integration-ready.
- [ ] 4.3 [FE-043, BE-040; M7, reviewers all] Review scoring hard stops, unchanged financial thresholds,12mo/48h/7day policies, location privacy, OTP/upload/overlap boundaries, owner access and synthetic data scenarios against all three owner baseline parts.
- [ ] 4.4 [FND-003; M2, reviewer M5] Confirm changes are confined to the13 allowlisted documents, all pending decisions remain visible and no application/config/package/rule/cloud/graph changes occurred; submit evidence for owner review and stop before foundation repair or archival.
