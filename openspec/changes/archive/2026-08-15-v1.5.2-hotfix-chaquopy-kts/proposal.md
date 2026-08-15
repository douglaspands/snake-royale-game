## Why

The v1.5.1 Android Release build (run [31855937551](https://github.com/douglaspands/snake-royale-game/actions/runs/31855937551/job/94940605600)) failed at the "Build Android APK with Gradle" step with `Unresolved reference: python/pip/install` in `android/app/build.gradle.kts`. Root cause: `android/build.gradle.kts` pins `com.chaquo.python` at `15.0.1`, the exact release that introduced Kotlin DSL (`.kts`) support for Chaquopy — and requires `.kts` files to declare Python config through a new top-level `chaquopy { }` block instead of the legacy `android.defaultConfig.python { }` block, which only remains valid in Groovy `build.gradle`. Additionally, `gh run list` showed the release workflow fired **twice in parallel** for the same tag (`v1.5.1` and previously `v1.5.0`) — once via `on.release` and once via `on.push.tags` — doubling build cost and risking a duplicate-asset race on `softprops/action-gh-release`.

## What Changes

- Migrate `android/app/build.gradle.kts` Python configuration from the legacy `android.defaultConfig.python { }` / `sourceSets.main.python.srcDir` syntax to the Chaquopy 15.0.1 Kotlin DSL: a top-level `chaquopy { defaultConfig { ... }; sourceSets { ... } }` block.
- Remove the redundant `on.push.tags` trigger from `.github/workflows/release.yml`, keeping only `on.release.types: [published]` and `workflow_dispatch`, and add a `concurrency` group as a safety net against duplicate/overlapping release runs.
- Add a `concurrency` group with `cancel-in-progress: true` to `.github/workflows/ci.yml` so superseded PR pushes stop consuming runner minutes.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `android`: Update `REQ-AND-006` (Automated GitHub Release Pipeline & APK Asset Generation) — the release pipeline now triggers only on GitHub Release publish (not on tag push), and the Chaquopy Python configuration uses the Kotlin-DSL-required `chaquopy { }` block.
- `harness`: Update `REQ-HARN-007` (PR-Only CI Status Gate Execution) to document the concurrency guard that cancels superseded CI runs on the same ref.

## Impact

- **Affected Files**:
  - `android/app/build.gradle.kts`
  - `.github/workflows/release.yml`
  - `.github/workflows/ci.yml`
- **Dependencies & Tools**: `com.chaquo.python` Gradle plugin `15.0.1` (Kotlin DSL requirement), no version bump.
- **Zero Breaking API Changes**: Game protocol, WebSocket interfaces, frontend client, and server game loop logic remain unaffected.
