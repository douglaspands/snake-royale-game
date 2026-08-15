## 1. Node 0 — Environment & Spec Validation

- [x] 1.1 Verify OpenSpec change delta integrity and run `openspec validate --specs --no-interactive`

## 2. Node B1 — Chaquopy Kotlin DSL Migration

- [x] 2.1 Remove the legacy `android.defaultConfig.python { }` block from `android/app/build.gradle.kts`
- [x] 2.2 Remove `python.srcDir("src/main/python")` from `android.sourceSets.main`, keeping `assets.srcDir(...)`
- [x] 2.3 Add a top-level `chaquopy { defaultConfig { version; pip { install(...) } }; sourceSets { getByName("main") { srcDir("src/main/python") } } }` block matching the plugin's own Kotlin DSL demo app

## 3. Node B2 — Release Workflow Trigger De-duplication

- [x] 3.1 Remove the `push: tags: 'v*'` trigger from `.github/workflows/release.yml`, keeping `release: types: [published]` and `workflow_dispatch`
- [x] 3.2 Add a `concurrency` group (`release-${{ github.ref }}`, `cancel-in-progress: false`) to `.github/workflows/release.yml`

## 4. Node B3 — CI Workflow Concurrency Guard

- [x] 4.1 Add a `concurrency` group (`ci-${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`) to `.github/workflows/ci.yml`

## 5. Node INT — Quality Gates & Verification

- [x] 5.1 Confirm `android/app/build.gradle.kts` structure matches the verified chaquopy `15.0.1` Kotlin DSL demo pattern
- [x] 5.2 Confirm workflow YAML structure via inspection (no local `gradle`/`actionlint`/`yamllint` available in this environment)
- [x] 5.3 Run `openspec doctor` and validate all specifications

## 6. Node DOC — Specification Sync & Archive Preparation

- [x] 6.1 Update `android` and `harness` delta specs for this change
- [x] 6.2 Prepare change summary for PR description
