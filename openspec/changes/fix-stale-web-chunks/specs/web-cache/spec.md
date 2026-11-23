## ADDED Requirements

### Requirement: Fresh web modules during development
The web app SHALL remove its existing Veyro service worker registration and shell caches when running in development.

#### Scenario: Previously installed worker
- **WHEN** the development page loads with a Veyro worker and an old shell cache
- **THEN** registration and shell cache cleanup complete and the page hydrates successfully

### Requirement: Network-first assets
The worker SHALL attempt network asset retrieval before using a cached fallback.

#### Scenario: Updated bundle available
- **WHEN** the browser requests a Next.js bundle while online
- **THEN** the response comes from the current server and refreshes the shell cache
