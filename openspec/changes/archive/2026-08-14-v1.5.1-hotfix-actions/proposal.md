## Why

The GitHub Actions workflow "Build Android Host APK & Publish to Release Assets" failed during the v1.5.0 release run due to missing Gradle tooling on Ubuntu runners and an incorrect Python source directory reference in the Chaquopy configuration (`../../../server` instead of local module alignment). Additionally, the CI test workflow was triggering redundantly on `push` to `main` after merges, consuming unnecessary runner minutes instead of acting strictly as a pre-requisite status check for Pull Request validation.

This hotfix addresses these CI/CD and build issues, ensuring deterministic Android APK compilation and efficient PR-only quality gate enforcement.

## What Changes

- **Android Release Pipeline (`release.yml`)**:
  - Incorporate `gradle/actions/setup-gradle@v4` with `gradle-version: "8.7"` to automatically provision Gradle and configure caching on Ubuntu runners.
  - Synchronize Python backend files (`server/`) into `android/app/src/main/python/server/` prior to assembling the Android package.
  - Update `android/app/build.gradle.kts` versionCode to `2` and versionName to `1.5.1`.
- **Continuous Integration Workflow (`ci.yml`)**:
  - Remove `push` triggers on `main` and `master`.
  - Maintain `pull_request` triggers targeting `main` and `master` with optional `workflow_dispatch` for on-demand execution.
- **Specification Alignment**:
  - Update OpenSpec specs for `android` and `harness` to document these CI/CD and build lifecycle guarantees.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `android`: Update `REQ-AND-006` (Automated GitHub Release Pipeline & APK Asset Generation) to require explicit Gradle provisioning via `gradle/actions/setup-gradle@v4` and isolated Chaquopy source distribution.
- `harness`: Update CI pipeline specifications to enforce PR-only validation gate execution without redundant post-merge triggers.

## Impact

- **Affected Files**:
  - `.github/workflows/ci.yml`
  - `.github/workflows/release.yml`
  - `android/app/build.gradle.kts`
- **Dependencies & Tools**: `gradle/actions/setup-gradle@v4` GitHub Action.
- **Zero Breaking API Changes**: Game protocol, WebSocket interfaces, frontend client, and server game loop logic remain unaffected.
