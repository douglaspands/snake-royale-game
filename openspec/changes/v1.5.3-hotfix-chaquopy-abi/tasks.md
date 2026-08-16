## 1. Node 0 — Claude Code Enablement & Context Optimization

*Prerequisite for every later node: the allowlist, slash commands and search filters below are what the remaining nodes run under.*

- [x] 1.1 Create `CLAUDE.md` at the repository root — essential commands, architecture map, SDD rules, quality gates, hotfix convention, and token-efficiency rules; pointing at canonical sources rather than duplicating them
- [x] 1.2 Create versioned `.claude/settings.json` with a read-only command allowlist (`openspec`, `npm test`, `npm run lint`, `uv run pytest|ruff|ty`, `gh run view|list`, `git status|diff|log`) and a deny list for secrets (`.env`, `android/local.properties`, `*.keystore`, `*.jks`)
- [x] 1.3 Create 6 thin-pointer slash commands in `.claude/commands/opsx-*.md` redirecting to `.agent/workflows/`
- [x] 1.4 Create 6 thin-pointer skills in `.claude/skills/openspec-*/SKILL.md` redirecting to `.agent/skills/`
- [x] 1.5 Add lockfiles (`uv.lock`, `package-lock.json`), Gradle artifacts and the generated Android sync directories to `.ignore` and `.antigravityignore`
- [x] 1.6 Create the `.cursorignore` promised by `openspec/config.yaml` but absent from the repository
- [x] 1.7 Add `.claude/settings.local.json` to `.gitignore`, keeping the shared `.claude/` config versioned
- [x] 1.8 Update `docs/SPEC_DRIVEN_DEVELOPMENT.md` section 4 to cover both agent adapters, and correct the section 5 claim about filtered lockfiles
- [x] 1.9 Update the `README.md` slash-command section to cover Antigravity and Claude Code
- [x] 1.10 Verify OpenSpec change delta integrity and run `openspec validate --specs --no-interactive`

## 2. Node B1 — Chaquopy ABI Matrix Correction

- [x] 2.1 Remove `armeabi-v7a` from `android.defaultConfig.ndk.abiFilters` in `android/app/build.gradle.kts`, leaving `arm64-v8a` and `x86_64`
- [x] 2.2 Confirm `chaquopy.defaultConfig.version` remains `"3.12"`, aligned with `requires-python = ">=3.12"` in `pyproject.toml`
- [x] 2.3 Bump the APK identity to `versionCode = 3` and `versionName = "1.5.3"`

## 3. Node B2 — GitHub Actions Node 24 Runtime Migration

- [x] 3.1 Determine, per action, the lowest major whose `action.yml` reports `runs.using: node24` (verified via `gh api`)
- [x] 3.2 Update `.github/workflows/release.yml`: `checkout@v5`, `setup-node@v5`, `setup-uv@v7`, `setup-java@v5`, `setup-android@v4`, `setup-gradle@v5`
- [x] 3.3 Update `.github/workflows/ci.yml`: `checkout@v5` (×3), `setup-node@v5` (×2), `setup-uv@v7`, `setup-python@v6`
- [x] 3.4 Confirm all existing action inputs are preserved verbatim and `softprops/action-gh-release@v2` is left untouched

## 4. Node B2b — Pure-Python Dependency Migration (FastAPI → Starlette)

*Discovered after the ABI fix let the build reach task execution: `:app:generateDebugPythonRequirements` failed because Chaquopy publishes no wheel for `pydantic-core` (Rust), making pydantic v2 — and therefore FastAPI — impossible to bundle. Confirms why all six release runs since v1.5.0 failed.*

- [x] 4.1 Confirm `pydantic` is never imported by the project and that `server/app` uses only 5 FastAPI symbols, 4 of which are direct Starlette re-exports
- [x] 4.2 Confirm `jsonschema` is test-only (`server/tests/harness/schema_validator.py`) and would pull `rpds-py`, a second Rust blocker
- [x] 4.3 Migrate `server/app/main.py` to Starlette: `Starlette(routes=[...])` with `Route`/`WebSocketRoute`/`Mount`, `JSONResponse` for the health endpoint, and the SPA catch-all kept last in the route table
- [x] 4.4 Migrate `server/app/websocket_handler.py` to `from starlette.websockets import WebSocket`
- [x] 4.5 Replace `fastapi`/`pydantic` with `starlette>=0.36.0` in `pyproject.toml`; move `jsonschema` to the `dev` dependency group
- [x] 4.6 Reduce the Chaquopy `pip` block to `starlette`, `uvicorn`, `websockets` — all pure-Python wheels
- [x] 4.7 Update stale FastAPI references in `openspec/config.yaml`, `README.md`, `CLAUDE.md`, `GEMINI.md`, `docs/BACKEND_QUALITY_GUIDELINES.md`

## 5. Node B3 — Version Metadata Synchronization

- [x] 5.1 Update `openspec/config.yaml` `project.version` to `1.5.3-ANDROID-HOST`
- [x] 5.2 Update `package.json` `version` to `1.5.3`
- [x] 5.3 Update `pyproject.toml` `version` to `1.5.3`

## 6. Node INT — Quality Gates & Verification

- [x] 6.1 Run `openspec doctor` and `openspec validate --specs --no-interactive`
- [x] 6.2 Run `npm test` (pytest + vitest + spec validation) and `npm run lint`
- [x] 6.3 Confirm workflow YAML structure by inspection (no local `gradle`/`actionlint`/`yamllint` available in this environment; `android/` has no Gradle wrapper and `ANDROID_HOME` is unset)
- [x] 6.4 Dry-run the Android build via `gh workflow run release.yml --ref <hotfix-branch>`; the upload step is skipped on a non-tag ref, so no release asset is touched
- [x] 6.5 Confirm the run shows no `GradleException` from `PythonPlugin.getAbis` and no `Node.js 20 is deprecated` annotation
- [x] 6.6 Re-run the dry-run after the Starlette migration and confirm `:app:generateDebugPythonRequirements` succeeds with every dependency resolving to a pure-Python wheel

## 7. Node B2c — Remaining Build Blockers Uncovered by the Dry-Run Loop

*Each fix advanced the build one stage further; all five failures were pre-existing and had been masked by the one before it.*

- [x] 7.1 Wire `merge<Variant>PythonSources` to `dependsOn("syncServerSources")`, resolving Gradle's implicit-dependency validation error on `src/main/python`
- [x] 7.2 Add the `ic_launcher` / `ic_launcher_round` mipmaps for all five density buckets — `AndroidManifest.xml` declared them but the project had no mipmap resources, failing AAPT resource linking
- [x] 7.3 Flatten slashes in the release APK filename so branch refs from `workflow_dispatch` dry-runs resolve to a file rather than a missing subdirectory

## 8. Node DOC — Specification Sync & Archive Preparation

- [x] 8.1 Author the `android` delta spec: ADDED `REQ-AND-007` and `REQ-AND-008`, MODIFIED `REQ-AND-001` and `REQ-AND-006`
- [x] 8.2 Author the `harness` delta spec: MODIFIED `REQ-HARN-007`
- [x] 8.3 Verify the full release pipeline green end to end via `workflow_dispatch` (run [31922834763](https://github.com/douglaspands/snake-royale-game/actions/runs/31922834763)) — APK built, artifact prepared, upload correctly skipped on a non-tag ref, zero annotations
- [ ] 8.4 Prepare the change summary for the PR description
