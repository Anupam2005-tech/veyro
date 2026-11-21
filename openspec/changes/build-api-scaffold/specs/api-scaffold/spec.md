## ADDED Requirements

### Requirement: Build and start the API from the workspace

The API build SHALL compile its shared contract dependency and produce the standalone Express server entry point.

#### Scenario: API build with no compiled contracts

- **WHEN** a developer with workspace dependencies installed runs `pnpm build:api` before compiling the contracts package
- **THEN** the build produces the required contracts declarations and the API server in `apps/api/dist/server.js`

#### Scenario: Compiled API handles requests

- **WHEN** the developer starts the compiled server with a configured local port
- **THEN** the health route returns HTTP 200 with status UP and an unknown route returns HTTP 404 with code ROUTE_NOT_FOUND
