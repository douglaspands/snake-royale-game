# Proposal — v1.7.0-i18n-score-desktop-builds

## Why

Three independent improvements are queued for the next feature release, unrelated to each other in code but shipping together as v1.7.0:

1. **No localization exists today.** Every user-facing string in the client is hardcoded English (`client/index.html`, `client/src/ui/hud.ts`). Portuguese and Spanish speakers — the project's likely first real audience — get an English-only game with no path to change that.
2. **Score is decoupled from mass in a way that rewards a shortcut.** `Snake.score` is a historical maximum (`score = max(score, int(mass * 10))`, `server/app/game/snake.py:140,177`): once a player reaches a given mass, boosting away that mass to escape a chase or squeeze through a gap costs nothing on the leaderboard. The snake's visible size stops matching the score driving the leaderboard, which reads as unfair to players who never boosted away mass.
3. **The game only runs where Python/Node is already installed, or on Android.** There is no way to hand a non-technical player a single file that hosts a match on Windows or macOS. An Android phone or a manual `uv`/`npm` setup are the only ways to run a server today.

## What Changes

1. **Automatic UI localization (pt-BR / es / en-US).** Detect the browser/OS-reported language (`navigator.language`) at startup and render the ~8 existing HUD/modal strings plus the page title in the matching locale. Falls back to `en-US` when the detected language isn't one of the three. No manual language switcher in this release — automatic detection only, confirmed with the user.
2. **Score becomes a direct function of current mass.** Replace the `max(score, mass*10)` high-water mark in both the boost-drain path (`Snake.step()`) and `Snake.add_mass()` with an unconditional `score = int(mass * 10)`. Boosting away mass now visibly costs score in lockstep, matching the stated principle that snake size must always reflect the score.
3. **Cross-platform desktop executables via PyInstaller.** A new desktop entry point starts the same embedded Starlette/Uvicorn server bound to all interfaces (so LAN players can still join, matching the Android host's behavior) and opens the default browser once the server responds healthy. CI builds one PyInstaller onefile executable per OS (Linux, Windows, macOS) and attaches each — unsigned, with a `.sha256` — to the same GitHub Release as the Android APK.

## Capabilities

- **`hud`** (MODIFIED via ADDED requirement) — localized UI text
- **`physics`** (MODIFIED) — `REQ-PHYS-002` gains the score/mass coupling clause
- **`desktop`** (ADDED, new capability) — desktop executable entry point and packaged release artifacts

## Impact

- **Client bundle**: adds a small `client/src/i18n/` module and three locale dictionaries; no new runtime dependency.
- **Server**: score semantics change for all live matches — no persistence/migration needed, score is in-memory match state only, never stored across sessions.
- **CI/CD**: `release.yml` gains a build matrix (`ubuntu-latest`, `windows-latest`, `macos-latest`) and grows the set of assets attached to every GitHub Release.
- **No protocol changes** — `WORLD_SNAPSHOT`'s `score` field keeps its existing type and meaning (an integer), only its derivation changes.
- **Distribution risk accepted**: desktop executables ship unsigned this release (no Authenticode / notarization) — Windows SmartScreen and macOS Gatekeeper will warn on first launch. Documented as a known limitation in `README.md`, not silently hidden.
