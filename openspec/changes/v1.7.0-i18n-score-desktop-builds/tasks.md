# Tasks — v1.7.0-i18n-score-desktop-builds

## Execution topology

```
                       ┌──────────────────────────────┐
                       │ Node 0 — orchestrator        │
                       │ spec validation (blocking)   │
                       └──────────────┬───────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
   ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
   │ Lane A  (subagent) │  │ Lane B  (subagent) │  │ Lane C  (subagent) │
   │ client-i18n        │  │ server-score-mass  │  │ desktop-packaging  │
   │ REQ-HUD-004        │  │ REQ-PHYS-002        │  │ REQ-DESK-001/002   │
   │ worktree           │  │ worktree            │  │ worktree            │
   └─────────┬──────────┘  └─────────┬──────────┘  └─────────┬──────────┘
             │                       │                       │
             └───────────────────────┼───────────────────────┘
                                     ▼   no merge-order constraint — disjoint files
                       ┌──────────────────────────────┐
                       │ Node MERGE — orchestrator     │
                       └──────────────┬───────────────┘
                                      ▼
                       ┌──────────────────────────────┐
                       │ Node INT — orchestrator      │
                       │ full quality gate + CI matrix│
                       └──────────────┬───────────────┘
                                      ▼
                       ┌──────────────────────────────┐
                       │ Node VAL — user + CI artifacts│
                       └──────────────┬───────────────┘
                                      ▼
                       ┌──────────────────────────────┐
                       │ Node DOC — orchestrator      │
                       └──────────────────────────────┘
```

Lanes A, B and C are launched **together, in one message**, each with `isolation: "worktree"`. No lane may edit a file outside its allowlist in `design.md` § Parallel execution — a lane that needs to cross the boundary stops and reports. No lane runs the root `npm test`; that is Node INT's job over the merged tree.

---

## 0. Node 0 — Environment & Spec Validation *(orchestrator, blocking)*

- [x] 0.1 Run `npm run spec:validate` and confirm the three delta specs of this change (`REQ-HUD-004`, `REQ-PHYS-002`, `REQ-DESK-001`, `REQ-DESK-002`) are well-formed before any lane starts
- [x] 0.2 Confirm the working tree is clean and note the exact commit each lane worktree must be cut from — verify the worktree base itself after creation, not just the orchestrator's `HEAD` (lesson from `v1.6.1`)
- [x] 0.3 Launch lanes A, B and C as sub-agents in a single message, each with `isolation: "worktree"`, each carrying: its requirement text, its file allowlist, its denylist, and the lane contract from `design.md`

---

## 1. Lane A — Client i18n *(subagent `client-i18n`, owns `REQ-HUD-004`)*

Allowlist: `client/src/i18n/**` (new), `client/src/ui/hud.ts`, `client/index.html`, `client/tests/i18n.test.ts` (new), `client/tests/hud.test.ts`. Denylist: `server/`, `android/`, `.github/`, `client/src/main.ts`, `client/src/input/`, `client/src/render/`.

- [x] A.1 Create `client/src/i18n/locales.ts` (or similar) with three flat dictionaries — `pt-BR`, `es`, `en-US` — covering every string identified in `design.md` § Context: the nickname modal title and placeholder, "ENTER ARENA", the death-screen title, "Final Score", "RESPAWN NOW", the default nickname fallback `'Viper'`, and the `<title>` in `client/index.html`
- [x] A.2 Create `client/src/i18n/detect.ts` (or similar) implementing the resolution order from `design.md` D1: exact match against `navigator.languages`/`navigator.language`, then base-language match, then `en-US` default. Export a pure function so it is unit-testable without a DOM
- [x] A.3 Wire `client/src/ui/hud.ts` to read strings from the resolved locale dictionary instead of hardcoded literals, at every site enumerated in A.1
- [x] A.4 Apply the resolved locale to `client/index.html`'s `<title>` at startup (e.g. via `document.title = ...` in the client bootstrap, not by templating the HTML file itself)
- [x] A.5 Add `client/tests/i18n.test.ts` covering the three `REQ-HUD-004` scenarios: supported language, unsupported language falls back to `en-US`, regional variant matches base language
- [x] A.6 Update `client/tests/hud.test.ts` for any assertion that depended on a hardcoded English string, without weakening coverage
- [x] A.7 Run `cd client && npm test` inside the lane worktree and report the result (files changed, test counts, coverage)
- [x] A.8 Report: exact files changed, test results, and any boundary the lane needed to cross

## 2. Lane B — Score/Mass Coupling *(subagent `server-score-mass`, owns `REQ-PHYS-002`)*

Allowlist: `server/app/game/snake.py`, `server/tests/` files covering `Snake` scoring/boost behavior. Denylist: `client/`, `android/`, `.github/`, any other `server/app/game/*.py`.

- [x] B.1 In `server/app/game/snake.py`, replace `self.score = max(self.score, int(self.mass * 10))` in `step()` (currently line 140) with an unconditional `self.score = int(self.mass * 10)`
- [x] B.2 Apply the identical change to `add_mass()` (currently line 177)
- [x] B.3 Confirm no other call site independently mutates `self.score` — grep `server/app/game/` and `server/app/` for `.score` assignments
- [x] B.4 Add or update a test asserting boost's mass drain reduces `score` in lockstep with mass, matching the `REQ-PHYS-002` "Boost drain reduces score" scenario
- [x] B.5 Confirm existing tests around `add_mass()`/food absorption still pass with the unconditional assignment — a test that asserted the old high-water-mark behavior needs updating, not silently deleting
- [x] B.6 Run `uv run pytest` inside the lane worktree and report the result (tests passed, coverage)
- [x] B.7 Report: exact files changed, test results, and any boundary the lane needed to cross

## 3. Lane C — Desktop Packaging *(subagent `desktop-packaging`, owns `REQ-DESK-001`, `REQ-DESK-002`)*

Allowlist: `server/app/__main__.py` (new), `pyproject.toml` (a `dev`/`build` dependency group only), `.github/workflows/release.yml`, `README.md` (a new "Running the desktop build" section only). Denylist: `client/`, `android/`, `server/app/main.py`'s existing route table, `server/app/game/`.

- [x] C.1 Create `server/app/__main__.py`: resolve the static directory the same way `server/app/main.py:72` does, start Uvicorn on a background thread bound to `0.0.0.0:8000`, poll `/health` until it responds successfully (bounded retry, no fixed `sleep` longer than a short poll interval), then call `webbrowser.open("http://localhost:8000")` on the main thread
- [x] C.2 Add PyInstaller to `pyproject.toml`'s `dev` (or a new `build`) dependency group — confirm by inspection it is absent from anywhere Chaquopy's `pip { install(...) }` block is defined in `android/app/build.gradle.kts`, since `REQ-AND-008` forbids build-only tools in the APK's runtime dependency list
- [x] C.3 Add a `build-desktop-executables` job to `.github/workflows/release.yml` with `strategy.matrix.os: [ubuntu-latest, windows-latest, macos-latest]`, running after the existing test gates: `uv sync`, build the frontend (`cd client && npm ci && npm run build`), then `uv run pyinstaller --onefile --name snake-royale-desktop-<os> --add-data "client/dist<sep>client_dist" server/app/__main__.py` (note the `:`/`;` path-separator difference on Windows)
- [x] C.4 Generate a `.sha256` checksum for each built executable and upload both the executable and checksum to the GitHub Release assets, alongside the existing Android APK upload step
- [x] C.5 Add the "Running the desktop build" section to `README.md`: how to download and run the executable per OS, and the exact SmartScreen/Gatekeeper bypass steps from `design.md` D5
- [x] C.6 Smoke-test locally to the extent the sandbox allows: run `python -m server.app` (or the lane's equivalent) and confirm the server starts and `/health` responds; if a local PyInstaller build is possible for the sandbox's OS, run it and confirm the produced binary starts and serves `/health`. Report explicitly which parts were verified locally and which are CI-matrix-only (e.g. Windows/macOS builds from a Linux sandbox)
- [x] C.7 Report: exact files changed, what was locally verified vs. deferred to the CI matrix, and any boundary the lane needed to cross

---

## 4. Node MERGE — Lane Integration *(orchestrator)*

- [x] 4.1 Merge all three lanes — fully disjoint file sets, no ordering constraint expected
- [x] 4.2 Review each lane's report for out-of-allowlist edits and reject any that crossed the boundary without reporting; verify per lane with `git status`/`git diff` inside each worktree rather than trusting the reports alone

## 5. Node INT — Quality Gates *(orchestrator, merged tree)*

- [x] 5.1 Run `cd client && npm test` (vitest, ≥80% coverage)
- [x] 5.2 Run `npm test` (root gate: pytest + vitest + openspec validate)
- [x] 5.3 Run `npm run lint` (`ruff check` + `ruff format --check` + `ty check`)
- [x] 5.4 Push a branch and let CI run the new `build-desktop-executables` matrix via `workflow_dispatch` (or an equivalent dry run) to confirm all three OS builds succeed before tagging a real release — mirrors the `v1.5.4` precedent of dry-running the release workflow before publishing
- [ ] 5.5 Update the version identity in `openspec/config.yaml`, `package.json`, `pyproject.toml`, `README.md` and `android/app/build.gradle.kts` (`versionCode`/`versionName`) to `1.7.0`

## 6. Node VAL — Validation *(user + CI artifacts)*

- [ ] 6.1 Confirm the pt-BR, es and en-US UI renders correctly by switching the browser's language setting (or `navigator.language` via devtools override) and reloading — no layout breakage from longer/shorter translated strings
- [ ] 6.2 Play a match, activate boost, and confirm the on-screen/leaderboard score visibly drops as mass drains, matching the snake's shrinking size
- [ ] 6.3 Download the CI-built Linux executable and run it; confirm the browser opens automatically and a LAN-joinable match starts
- [ ] 6.4 Download the CI-built Windows executable on a Windows machine; confirm the SmartScreen bypass documented in `README.md` works and the executable behaves like 6.3
- [ ] 6.5 Download the CI-built macOS executable on a Mac; confirm the Gatekeeper bypass documented in `README.md` works and the executable behaves like 6.3
- [ ] 6.6 Confirm the Android APK build is unaffected — same signer, same size class as `v1.6.1`, PyInstaller absent from its dependency tree

## 7. Node DOC — Spec Sync & Archive *(orchestrator)*

- [ ] 7.1 Run `/opsx-sync` to merge `REQ-HUD-004` into `openspec/specs/hud/spec.md`, the modified `REQ-PHYS-002` into `openspec/specs/physics/spec.md`, and create `openspec/specs/desktop/spec.md` with `REQ-DESK-001`/`REQ-DESK-002`
- [ ] 7.2 Run `npm run spec:doctor` and confirm no orphaned or duplicated requirement identifiers
- [ ] 7.3 Archive as `openspec/changes/archive/AAAA-MM-DD-v1.7.0-i18n-score-desktop-builds/`
- [ ] 7.4 Tag and publish release `v1.7.0`, then verify all published assets (Android APK, Linux/Windows/macOS executables, and every `.sha256`) and their checksums
