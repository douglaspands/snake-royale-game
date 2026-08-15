## Context

See `proposal.md` for background and motivation. The GitHub Actions Android APK release build failed due to missing Gradle tooling and relative path resolution in Chaquopy, while CI was running redundantly on post-merge push events.

## Goals / Non-Goals

**Goals:**
- Provide deterministic Android Host APK compilation in GitHub Actions (`release.yml`) using `gradle/actions/setup-gradle@v4`.
- Structure Python backend sources so Chaquopy packages `server` cleanly as a package at `src/main/python/server`.
- Restrict Continuous Integration execution (`ci.yml`) strictly to Pull Requests and manual dispatches, eliminating redundant post-merge triggers.
- Bump Android package version to `1.5.1` (versionCode `2`).

**Non-Goals:**
- Modifications to core Python game loop, WebSocket protocol, or physics simulation.
- Frontend rendering or HUD layout changes.

## Decisions

### 1. Provision Gradle with `gradle/actions/setup-gradle@v4`
- **Decision**: Use `gradle/actions/setup-gradle@v4` with `gradle-version: "8.7"`.
- **Rationale**: Ubuntu runners on GitHub Actions do not guarantee a global `gradle` binary in `PATH`. `setup-gradle` downloads and sets up Gradle 8.7, configures the environment, and manages build caching automatically.
- **Alternatives Considered**: Committing Gradle wrapper binaries (`gradle-wrapper.jar`) into git — rejected to keep the repository lightweight and binary-free.

### 2. Synchronize Python Server Package into Android Source Tree
- **Decision**: In the release workflow, copy `server/` into `android/app/src/main/python/server/` prior to invoking Gradle assemble.
- **Rationale**: Chaquopy packages all files in `src/main/python` into the APK's Python root directory. Placing `server/` inside `src/main/python/` allows `from server.app.main import app` to resolve cleanly without fragile multi-level relative traversal (`../../../server`).
- **Alternatives Considered**: Using `python.srcDir("../../server")` — viable, but can create packaging naming issues if Chaquopy flattens the top-level directory.

### 3. PR-Only CI Execution Gate
- **Decision**: Update `.github/workflows/ci.yml` `on:` trigger to listen exclusively to `pull_request` against `main` and `master`, plus `workflow_dispatch`.
- **Rationale**: Pull request status checks provide complete coverage and validation prior to merge. Running CI again on the merge commit is redundant and wastes runner compute.

## Risks / Trade-offs

- **[Risk] Chaquopy Python wheel download time in CI** → **Mitigation**: `setup-gradle@v4` caches downloaded artifacts, Gradle caches, and wrapper distributions across workflow runs.
- **[Risk] Untracked files in local `android/app/src/main/python/server`** → **Mitigation**: Ensure `.gitignore` ignores transient build sync folders if generated locally.
