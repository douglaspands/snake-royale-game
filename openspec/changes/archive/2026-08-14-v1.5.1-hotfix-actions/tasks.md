## 1. Node 0 — Environment & Spec Validation

- [x] 1.1 Verify OpenSpec change delta integrity and run `openspec validate --specs --no-interactive`

## 2. Node B1 — CI Workflow Trigger Optimization

- [x] 2.1 Remove `push` triggers from `.github/workflows/ci.yml` and retain `pull_request` on `[main, master]` and `workflow_dispatch`
- [x] 2.2 Validate YAML syntax and linting for `ci.yml`

## 3. Node B2 — Release Workflow & Gradle Action Provisioning

- [x] 3.1 Update `.github/workflows/release.yml` with `gradle/actions/setup-gradle@v4` with `gradle-version: "8.7"`
- [x] 3.2 Add step to synchronize `server/` to `android/app/src/main/python/server/` in `release.yml`
- [x] 3.3 Ensure Gradle execution in `release.yml` runs `gradle assembleDebug --stacktrace` directly without fallback wrapper generation

## 4. Node B3 — Android Build Configuration Alignment

- [x] 4.1 Update `versionCode = 2` and `versionName = "1.5.1"` in `android/app/build.gradle.kts`
- [x] 4.2 Adjust `sourceSets` in `android/app/build.gradle.kts` to reference `src/main/python` and avoid invalid parent directory references

## 5. Node INT — Quality Gates & Verification

- [x] 5.1 Run backend quality gates (`uv run ruff check server`, `uv run ruff format --check server`, `uv run ty check server`)
- [x] 5.2 Run backend pytest suite (`uv run pytest`)
- [x] 5.3 Run frontend vitest suite and build (`cd client && npm test && npm run build`)
- [x] 5.4 Run OpenSpec doctor and validate all specifications

## 6. Node DOC — Specification Review & Archive Preparation

- [x] 6.1 Prepare change summary and verification artifacts
