## Why

The v1.5.2 Android Release build (run [31858134843](https://github.com/douglaspands/snake-royale-game/actions/runs/31858134843/job/94946568190)) failed at the "Build Android APK with Gradle" step with:

```
Caused by: org.gradle.api.GradleException: Variant 'debug': Python 3.12 is not
available for the ABI 'armeabi-v7a'. Supported ABIs are [arm64-v8a, x86_64].
    at com.chaquo.python.PythonPlugin.getAbis(PythonPlugin.kt:255)
    at com.chaquo.python.PythonPlugin.afterVariant(PythonPlugin.kt:228)
```

Root cause: `android/app/build.gradle.kts` declares `abiFilters += listOf("arm64-v8a", "armeabi-v7a", "x86_64")`, but Chaquopy `15.0.1` ships no Python 3.12 runtime for 32-bit ARM. The plugin asserts this in `afterVariant`, i.e. **at configuration time** — so the build dies before any task executes, and the message names the `debug` variant because `release.yml` runs `gradle assembleDebug`.

Fixing the ABI let the build reach task execution and immediately exposed a **second, pre-existing blocker** that the configuration failure had been masking: `:app:generateDebugPythonRequirements` failed with `FileNotFoundError: [Errno 2] No such file or directory: 'maturin'` while installing `pydantic-core==2.46.4` from a source distribution. Chaquopy publishes no prebuilt wheel for `pydantic-core` (a Rust extension), and cannot compile Rust at build time — so **pydantic v2, and therefore FastAPI, cannot be bundled into the APK at all**. `jsonschema` carries the same problem one step behind, via the Rust package `rpds-py`. This explains why the Android build has never succeeded: every one of the six release runs since v1.5.0 failed.

Two secondary problems surfaced in the same run. First, the run emitted `Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/setup-java@v4, actions/setup-node@v4, android-actions/setup-android@v3, astral-sh/setup-uv@v3, gradle/actions/setup-gradle@v4` — today a warning, scheduled to become a hard failure. Second, `android/app/build.gradle.kts` still declared `versionName = "1.5.1"` / `versionCode = 2`, so the v1.5.2 release would have shipped an APK labelled 1.5.1 internally; `openspec/config.yaml` (1.4.0-HUD-LAYOUT), `package.json` (1.4.0) and `pyproject.toml` (1.0.0) are likewise stale against the published 1.5.x releases.

Separately, the repository is configured exclusively for Google Antigravity (`GEMINI.md`, `.agent/`, `.antigravityignore`) and carries no Claude Code configuration at all. It also violates its own `token_efficiency` rule in `openspec/config.yaml` — which promises lockfiles are filtered via `.ignore`, `.antigravityignore` and `.cursorignore`, while `uv.lock` (193 KB) is filtered nowhere and `.cursorignore` does not exist.

## What Changes

- Enable and optimize the repository for Claude Code, as a prerequisite step: add `CLAUDE.md`, a versioned `.claude/settings.json` permission allowlist, and thin-pointer adapters in `.claude/skills/` and `.claude/commands/` that redirect to the canonical `.agent/` definitions.
- Close the token-efficiency gaps: add lockfiles, Gradle artifacts and the generated Android sync directories to `.ignore` / `.antigravityignore`, and create the missing `.cursorignore`.
- Remove `armeabi-v7a` from `android.defaultConfig.ndk.abiFilters`, keeping the Chaquopy Python runtime at `3.12` to stay aligned with the backend's `requires-python = ">=3.12"`.
- Migrate the server from FastAPI to Starlette, removing pydantic from the dependency tree entirely. `server/app` imports five FastAPI symbols and four of them are direct Starlette re-exports; pydantic is never imported by the project. Move the test-only `jsonschema` into the `dev` dependency group and reduce the Chaquopy install list to `starlette`, `uvicorn`, `websockets` — all pure-Python wheels.
- Bump the Android APK identity to `versionCode = 3` / `versionName = "1.5.3"`.
- Pin every GitHub Action in `ci.yml` and `release.yml` to the lowest major version that runs on the `node24` runtime, eliminating the deprecation warnings.
- Synchronize the stale version metadata in `openspec/config.yaml`, `package.json` and `pyproject.toml`.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `android`: Add `REQ-AND-007` (Supported CPU Architecture (ABI) Matrix) constraining `abiFilters` to ABIs with an available Chaquopy runtime for the configured Python version, and `REQ-AND-008` (Pure-Python Dependency Constraint for the Embedded Server) requiring every bundled package to resolve to a pure-Python or Chaquopy-prebuilt wheel. Update `REQ-AND-001` (Android Foreground Service Lifecycle) to name Starlette rather than FastAPI, and `REQ-AND-006` (Automated GitHub Release Pipeline & APK Asset Generation) to require that ABI matrix and Node 24 action runtimes.
- `harness`: Update `REQ-HARN-007` (PR-Only CI Status Gate Execution) to require that CI gate actions run on a supported Node 24 runtime, free of deprecation warnings.

## Impact

- **Affected Files**:
  - `CLAUDE.md`, `.claude/settings.json`, `.claude/commands/opsx-*.md` (6), `.claude/skills/openspec-*/SKILL.md` (6)
  - `.ignore`, `.antigravityignore`, `.cursorignore`, `.gitignore`
  - `docs/SPEC_DRIVEN_DEVELOPMENT.md`, `README.md`
  - `android/app/build.gradle.kts`
  - `server/app/main.py`, `server/app/websocket_handler.py`
  - `.github/workflows/release.yml`, `.github/workflows/ci.yml`
  - `openspec/config.yaml`, `package.json`, `pyproject.toml`, `README.md`, `GEMINI.md`, `docs/BACKEND_QUALITY_GUIDELINES.md`
- **Dependencies & Tools**: no version bump to Chaquopy (`15.0.1`), AGP (`8.4.1`), Kotlin (`1.9.24`) or Gradle (`8.7`). GitHub Actions majors advance to their first `node24` release.
- **Device Coverage Change**: the APK no longer targets 32-bit ARM (`armeabi-v7a`). Remaining coverage is `arm64-v8a` (all 64-bit Android devices, essentially every device since 2016) plus `x86_64` (emulators).
- **Zero Breaking API Changes**: game protocol, WebSocket interfaces, frontend client, and server game loop logic remain unaffected.
