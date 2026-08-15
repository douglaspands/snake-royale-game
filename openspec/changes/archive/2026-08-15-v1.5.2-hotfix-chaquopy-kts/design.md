## Context

See `proposal.md` for background and motivation. The v1.5.1 release build failed compiling `android/app/build.gradle.kts` because Chaquopy `15.0.1` requires Kotlin `.kts` build scripts to configure Python support through a new top-level `chaquopy { }` extension block; the file still used the legacy Groovy-only `android.defaultConfig.python { }` block, which the Kotlin script compiler cannot resolve (`Unresolved reference: python/pip/install`). Separately, `release.yml` fired twice per release (via `on.release` and `on.push.tags`) because publishing a GitHub Release also creates the underlying tag.

## Goals / Non-Goals

**Goals:**
- Make `android/app/build.gradle.kts` compile under Chaquopy 15.0.1's Kotlin DSL, using the exact structure validated against the official chaquopy demo app (`chaquo/chaquopy` repo, `demo/app/build.gradle.kts`).
- Ensure the release workflow runs exactly once per published release.
- Add a general-purpose concurrency guard to both workflows to prevent future duplicate/overlapping runs.

**Non-Goals:**
- Upgrading the Chaquopy, AGP, Kotlin, or Gradle versions.
- Changing the Python dependency list bundled into the APK (fastapi, uvicorn, websockets, pydantic, jsonschema stay the same).
- Any change to core game logic, protocol, or frontend/backend behavior.

## Decisions

### 1. Move Python config into a top-level `chaquopy { }` block
- **Decision**: Replace `android { defaultConfig { python { version; pip { install(...) } } } }` and `android { sourceSets { main { python.srcDir(...) } } }` with a sibling top-level block: `chaquopy { defaultConfig { version; pip { install(...) } }; sourceSets { getByName("main") { srcDir("src/main/python") } } }`.
- **Rationale**: This is the exact syntax Chaquopy's own Kotlin DSL demo app uses, and matches the changelog entry for `15.0.1` ("Kotlin build.gradle.kts files must use the new DSL"). Verified by fetching `chaquo/chaquopy`'s `demo/app/build.gradle.kts` from GitHub and cross-checking against the project's pinned plugin version.
- **Alternatives Considered**: Downgrading to a pre-15.0.1 Chaquopy release that doesn't require the new DSL — rejected because older releases predate official Kotlin DSL support entirely (per GitHub issue chaquo/chaquopy#959, pre-release-only), and would still fail the same way since this project already uses `.kts` files everywhere.

### 2. Drop the `push: tags` trigger from `release.yml`
- **Decision**: Trigger the release workflow only on `release: types: [published]` (plus `workflow_dispatch`), removing `push: tags: 'v*'`.
- **Rationale**: `gh run list` confirms both triggers fired for the same tag at the same timestamp for both `v1.5.0` and `v1.5.1`, running the full build+upload pipeline twice concurrently. Publishing a GitHub Release is the actual deploy signal used by this project (release notes + asset upload), and it already implies tag creation, so the tag-push trigger is pure duplication.
- **Alternatives Considered**: Keeping both triggers but adding an `if` guard to skip one — rejected as more complex and fragile than simply removing the redundant trigger, since there is no scenario where a bare tag push (without a Release published) should build a release APK in this project's workflow.

### 3. Add `concurrency` groups to both workflows
- **Decision**: `release.yml` gets `concurrency: { group: release-${{ github.ref }}, cancel-in-progress: false }`; `ci.yml` gets `concurrency: { group: ci-${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }`.
- **Rationale**: Defense-in-depth against future duplicate-trigger regressions on the release side (queue instead of clobbering a release build), and standard CI hygiene on the PR side (cancel stale runs when new commits land, saving runner minutes).

## Risks / Trade-offs

- **[Risk] Chaquopy DSL structure drifts again in a future plugin upgrade** → **Mitigation**: Verified directly against the plugin's own demo app source and changelog rather than third-party blog posts; version stays pinned at `15.0.1` so no further drift until an explicit upgrade.
- **[Risk] `cancel-in-progress: false` on release.yml means a stuck previous run could delay a new release** → **Mitigation**: Acceptable trade-off — release builds should never be silently cancelled mid-upload; a stuck run can be manually cancelled from the Actions UI.
