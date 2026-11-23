## Identity and access

| Task | Evidence | Status |
|---|---|---|
| BE-002 | Firestore-backed role checks, active account enforcement, legacy and multi-role profiles | REVIEW |
| BE-003 | Session endpoint, concurrent bootstrap, Auth identity sync, protected field preservation and OpenAPI contract | REVIEW |
| BE-004 | Consumption requested, missing/invalid/expired/replayed tokens denied and service error handled | REVIEW |

- [x] Build and type-check the API and run all 45 API tests with local Auth and Firestore.
- [ ] Verify real App Check consumption with the web client's limited-use token and the deployed verifier identity.
- [ ] Complete partner and outside-pair security/contract review.

## Team 2 completion follow-up

Provider inspection and lead-only audited grants are implemented. The owner will supply the lead UID later; frontend credential linking and real App Check remain pending. [Execution register](../complete-team2-backend/tasks.md).
