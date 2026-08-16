## Context

See `proposal.md` § Why. Three unrelated improvements, bundled into one release because they queued up together, not because they share code:

1. Zero i18n exists. `client/index.html:7` and `client/src/ui/hud.ts` (lines 56, 57, 77, 96, 99, 103, 150) hold every user-facing string as an English literal.
2. `Snake.score` is a historical maximum (`server/app/game/snake.py:140` inside `step()`, `:177` inside `add_mass()`): `self.score = max(self.score, int(self.mass * 10))`. Boost's mass drain (`BOOST_MASS_DRAIN = 4.0 mass/s`, lines 111-126) never lowers it.
3. No packaging path exists for a standalone desktop binary. `server/app/main.py:72` (`resolve_static_dir()`) is the only cross-environment entry point today; Android's `android_entry.py` and `npm run dev`'s `uvicorn server.app.main:app` are the only two callers. There is no `server/app/__main__.py` and no PyInstaller config anywhere in the repo.

## Goals / Non-Goals

**Goals**
- A player whose OS/browser reports `pt-BR`, `es`, or `en-US` sees the game in that language with no action on their part.
- Score always equals `floor(mass * 10)` — never higher than what the current mass represents, whether mass was lost to boost or (in the future) any other mechanism.
- A user with no Python, Node, or Android device can download one file from the GitHub Release and have a working, LAN-joinable match running within seconds of double-clicking it, on Linux, Windows, or macOS.

**Non-Goals**
- A manual language switcher UI. Automatic detection only, per explicit decision — out of scope for v1.7.0.
- Code signing / notarization for the desktop executables. Unsigned this release, per explicit decision; SmartScreen/Gatekeeper warnings are documented, not eliminated.
- Any language beyond the three named locales. Unsupported OS languages fall back to `en-US`.
- Auto-update for the desktop executables. A new release means a new manual download, same as the Android APK today.
- Reworking `WORLD_SNAPSHOT` or any protocol packet — `score` keeps its existing integer type and field name; only its server-side derivation changes.
- A system tray icon, GUI window, or "stop server" button for the desktop build. It is a console process; closing the window/terminal stops it, matching the simplicity of `npm run dev`.

## Decisions

### D1 — Locale detection via `navigator.language`/`navigator.languages`, dictionary-based translations, no framework
A small `client/src/i18n/` module resolves the active locale once at startup: try each entry in `navigator.languages` (falling back to `navigator.language`), match by exact code first (`pt-BR`, `es`, `en-US`), then by base language (`pt` → `pt-BR`, `es-MX` → `es`, `en-GB` → `en-US`), and default to `en-US` if nothing matches. Three flat `Record<string, string>` dictionaries hold the ~8 strings; `hud.ts` and `index.html`'s title are updated to look up keys instead of hardcoding text. *Alternative considered:* a full i18n library (e.g. i18next) — rejected as disproportionate for 8 strings and three locales, and it would add a runtime dependency to a client that currently has none of its own.

### D2 — Score becomes an unconditional function of mass, not a special case for boost only
The user's stated principle is general — "snake size must be a reflection of the score" — not boost-specific. Replacing `max(score, mass*10)` with `score = int(mass * 10)` unconditionally satisfies that for every present and future mass-changing mechanic (boost drain today; anything else later) with one change, rather than special-casing the boost path and leaving a latent inconsistency for the next mass-affecting feature. `add_mass()` and `step()` both simplify to the same one-line assignment. *Alternative considered:* keep the high-water mark for growth and only let boost's drain reduce it — rejected as a special case that reintroduces the same inconsistency the moment another mass-reducing mechanic is added, and as strictly more code for a worse invariant.

### D3 — Desktop server binds all interfaces and opens the browser only after a health check succeeds
`server/app/__main__.py` (new) becomes the single entry point shared by `python -m server.app` and the PyInstaller executable. It starts Uvicorn programmatically (`uvicorn.run(app, host="0.0.0.0", port=8000)` — matching the Android host's LAN-joinable behavior, not `127.0.0.1`, since this is a multiplayer game and a PC is a plausible host for a LAN party the same way a phone is) on a background thread, polls its own `/health` endpoint until it responds, then calls `webbrowser.open("http://localhost:8000")` on the main thread. Opening only after a confirmed health response avoids the race of a browser tab loading before the server socket is bound. *Alternative considered:* fixed `time.sleep(1)` before opening the browser — rejected, matches the "must be an observed state, not an assumption" principle already established for `REQ-AND-010`'s dashboard status, and is flaky on a slow machine.

### D4 — PyInstaller onefile, built per-OS in a GitHub Actions matrix, sharing the existing release job
`release.yml` gains a `build-desktop-executables` job with `strategy.matrix.os: [ubuntu-latest, windows-latest, macos-latest]`, running after the existing test gates. Each OS runs `uv sync`, then `uv run pyinstaller --onefile --name snake-royale-desktop-<os> --add-data "client/dist:client_dist" server/app/__main__.py` (path separator differs on Windows: `;` not `:`), producing one executable per OS plus a `.sha256`, uploaded to the same GitHub Release as the Android APK. *Alternative considered:* Nuitka — rejected for this release: better runtime performance but a materially more complex/slower CI matrix to get right first, and PyInstaller is the well-trodden path for a Starlette/Uvicorn app. Revisit only if PyInstaller's cold-start time or binary size becomes a real complaint.

### D5 — No code signing this release; document the OS warnings instead of suppressing them
Windows Authenticode (~$100-400/yr) and Apple notarization (Apple Developer Program, $99/yr) are real recurring costs and process overhead disproportionate to a first desktop release. `README.md` gains a short "Running the desktop build" section naming the exact click-through steps for SmartScreen ("More info" → "Run anyway") and Gatekeeper (right-click → "Open", or `xattr -d com.apple.quarantine <file>`). Revisit if adoption data ever justifies the cost.

### D6 — Three parallel sub-agent lanes over isolated git worktrees
i18n (client), score/mass coupling (server physics), and desktop packaging (new entry point + CI) touch three disjoint file sets with zero shared lines, so they run as three sub-agents in isolated worktrees launched together after Node 0, following the pattern validated in `v1.6.1-hotfix-mobile-gameplay`. See § Parallel execution.

## Parallel execution

Node 0 (spec validation) runs in the orchestrator and **must** pass before any lane starts — no production code before its spec is validated, per `CLAUDE.md`. The three lanes then run concurrently; Node MERGE, Node INT, Node VAL and Node DOC all run in the orchestrator after every lane has reported.

| Lane | Sub-agent | Owns requirement | May touch | Must not touch |
| :--- | :--- | :--- | :--- | :--- |
| **A — Client i18n** | `client-i18n` | `REQ-HUD-004` (added) | `client/src/i18n/**` (new), `client/src/ui/hud.ts`, `client/index.html`, `client/tests/i18n.test.ts` (new), `client/tests/hud.test.ts` | `server/`, `android/`, `.github/`, `client/src/main.ts`, `client/src/input/`, `client/src/render/` |
| **B — Score/mass coupling** | `server-score-mass` | `REQ-PHYS-002` (modified) | `server/app/game/snake.py`, `server/tests/` files covering `Snake` scoring/boost | `client/`, `android/`, `.github/`, any other `server/app/game/*.py` |
| **C — Desktop packaging** | `desktop-packaging` | `REQ-DESK-001`, `REQ-DESK-002` (added, new capability) | `server/app/__main__.py` (new), `pyproject.toml` (PyInstaller as a `dev`/`build` dependency group only — MUST NOT enter the Chaquopy/Android install list, see `REQ-AND-008`), `.github/workflows/release.yml`, `README.md` (desktop section only) | `client/`, `android/`, `server/app/main.py`'s existing route table, `server/app/game/` |

**Isolation.** Each lane is launched with `isolation: "worktree"` so it builds and tests against its own checkout without seeing partial work from the others.

**Conflict boundary.** All three lanes are fully disjoint — no file appears in more than one lane's allowlist. No merge-order constraint is required; any order is safe. Lane C must not add PyInstaller (or any build-only dependency) to the Chaquopy `pip { install(...) }` block — `REQ-AND-008` already constrains that list to pure-Python-wheel runtime dependencies, and PyInstaller is a build-time tool that must never ship inside the Android APK.

**Lane contract.** Every lane must, before reporting complete: (1) keep its own capability's scenarios satisfied; (2) run the relevant local test suite (`cd client && npm test` for lane A; `uv run pytest` for lane B; a smoke-run of `python -m server.app` plus, if the runner has it, a local `pyinstaller` build for lane C — noting explicitly if the sandbox lacks a working PyInstaller/Wine toolchain for a given OS); (3) report the exact files changed and anything it needed outside its allowlist — a lane that must cross the boundary stops and reports instead of editing.

**What stays in the orchestrator.** Node 0, the merge, Node INT (the full `npm test` + `npm run lint` gate over the merged tree), the CI-only cross-OS PyInstaller matrix build, Node VAL, and Node DOC.

## Risks / Trade-offs

- **[Risk]** A player's final score on the death screen ("Final Score", `hud.ts:99`) can now read lower than a peak they saw moments earlier mid-match, since score no longer holds a high-water mark. → Accepted, this is the explicit fix: the leaderboard and the visible snake size must agree at every instant, not just at peak.
- **[Risk]** `uv run pyinstaller` bundling `client/dist` as `--add-data` needs the frontend built (`npm run build`) before the Python packaging step runs in CI, mirroring the existing `android:sync-client` ordering. → Sequenced explicitly in the CI job; called out as a task in `tasks.md`.
- **[Risk]** Locale detection runs once at page load; a browser language change mid-session won't retranslate without a reload. → Accepted as a non-goal; matches "automatic only" scope, and a full page reload already re-detects correctly.
- **[Risk]** Binding the desktop server to `0.0.0.0` exposes it on the LAN by default, same as Android. A user on an untrusted network (e.g. a coffee shop) hosts a match without being warned. → Same trust model the Android host already ships with (`REQ-AND-001`/`REQ-AND-002`); no new exposure class, and out of scope to change here.
- **[Trade-off]** Unsigned executables trigger OS warnings that will deter some fraction of users from ever running the binary. → Explicitly accepted per the user's decision; revisit if adoption data justifies the signing cost.
- **[Trade-off]** This sandbox likely cannot cross-build or run a Windows/macOS PyInstaller executable locally — only CI's matrix runners can. Lane C's local verification is necessarily partial (Linux-only, or a dry read of the spec file); Node VAL's cross-OS confirmation happens against the CI-built artifacts, not a local run.
