## Context

See `proposal.md` for the defect analysis. In short: the Android host has never served the game. The SPA ships inside the APK but is unreachable, the environment variable that would point at it is exported after it is read, and every failure on that path is swallowed — so three releases shipped with the feature broken and nothing on the device said so.

`v1.5.4` made the APK installable and is a prerequisite for this change being testable at all; it did not touch the runtime path. The install symptom and this one were separate defects that happened to share a release.

The third defect is the reason the first two survived so long, and it shapes the design here: a fix that makes the server work but keeps reporting success unconditionally would leave the next regression equally invisible.

## Goals / Non-Goals

**Goals:**
- Serve the bundled SPA from the embedded server on the device.
- Guarantee the served bundle matches the installed APK after an upgrade.
- Make a failed start visible — in the log and on the dashboard — instead of reporting "Online" regardless.
- Keep desktop and development behavior byte-for-byte unchanged.

**Non-Goals:**
- Fixing `QRCodeHelper`. It emits a bitmap that no scanner can decode: no Reed-Solomon codewords, the reserved format-information area is never written, no dark module, no quiet zone. That is a missing encoder, not a patchable bug, and folding it in would double the change while delaying the fix that makes the game reachable at all. Tracked separately.
- Serving assets directly out of `AssetManager` through a Chaquopy bridge. See Decision 1.
- Play Store publication. Sideloading this APK requires the user to clear Play Protect's verification prompt; that is documented, not engineered around.
- Any change to the game protocol, the client bundle, or the server game loop.

## Decisions

### 1. Extract assets to `filesDir` rather than bridging `AssetManager` into Python
- **Decision**: Copy `assets/client_dist/` recursively into `filesDir/client_dist` on startup and pass that absolute path to `start_server`.
- **Rationale**: Starlette's `StaticFiles` and the existing `serve_spa`/`FileResponse` path both operate on real filesystem paths. Extraction keeps the entire Python side unchanged — `resolve_static_dir()` keeps its candidate list, and desktop behavior is untouched — so the change is confined to Kotlin plus one import-ordering fix. Bridging `AssetManager` would mean a custom Starlette endpoint reading through a JNI callback for every asset request, which diverges the Android serving path from the desktop one that the test suite actually covers. The cost is ~40 KB of duplicated storage, which is negligible against the 40 MB APK.
- **Alternatives Considered**: (a) Move `client_dist` into the Chaquopy Python source root so it lands on a real path — rejected: it mixes web assets into a Python package tree, and Chaquopy's source handling is tuned for importable modules, not arbitrary binary payloads. (b) `AssetManager` bridge — rejected above.

### 2. Key extraction on `versionCode`, not on directory existence
- **Decision**: Write a marker file recording the `versionCode` that produced the extraction, and re-extract whenever it differs. Skip the copy when it matches.
- **Rationale**: Keying on "does the directory exist" would leave an upgraded install serving the previous release's JS bundle indefinitely — a stale-asset bug that presents as the app being mysteriously out of date, and one that would only appear after a release, i.e. in exactly the situation where it is hardest to diagnose. Vite emits content-hashed filenames (`index-zn7FLEeE.js`), so a stale `index.html` would reference a chunk that no longer exists and the app would fail to boot with a 404 rather than degrade visibly.
- **Alternatives Considered**: Extracting unconditionally on every service start — correct but wasteful, and it puts a recursive copy on the startup path of every launch.

### 3. Set the environment before importing, rather than making route building lazy
- **Decision**: Move `from server.app.main import app` from module scope into `start_server()`, after the environment variables are set.
- **Rationale**: The ordering bug is that `main.py` resolves its static directory while building the route table at import time. Two fixes exist: defer the import, or make route building lazy. Deferring the import is three lines, confined to the Android entry point, and leaves `main.py` — which the desktop server and the whole test suite depend on — completely untouched. Making route building lazy would restructure the module that every other consumer imports, to solve a problem only the Android host has.
- **Alternatives Considered**: Having Kotlin set the environment variable through Chaquopy before calling `getModule` — rejected: it splits one invariant across the language boundary, so the Python entry point would only be correct when called by this specific Kotlin caller, and the existing bridge test could not cover it.

### 4. Verify the server by polling `/health`, not by trusting the start call
- **Decision**: After requesting a start, `MainActivity` polls `http://localhost:<port>/health` on a background thread with a bounded number of retries, and sets the status from the outcome.
- **Rationale**: `startForegroundService` is asynchronous and returns before the service has done anything; the Python server then starts on yet another thread inside the service. There is no synchronous return value that means "the server is up", so any status derived from the start call is a guess. `/health` is the only signal that actually proves the server is listening, and it is deliberately independent of the static assets — so it distinguishes "server down" from "server up but serving nothing", the exact ambiguity that made this defect hard to characterise from the device.
- **Trade-off**: This introduces a short window where the dashboard shows a starting state. That is accurate, and preferable to an instant answer that is wrong.

## Risks / Trade-offs

- **The fix cannot be verified in CI.** No test in this repository executes Chaquopy or an Android runtime; the Gradle build only proves it compiles. The Python-side ordering fix is unit-testable and will be tested, but asset extraction and the health-poll are verifiable only by installing the APK on the device. `tasks.md` keeps those as explicit device steps rather than implying CI coverage.
- **`/health` polling from the main activity adds a network call on a background thread.** Bounded retries and a short timeout keep it from leaking, but it is new lifecycle surface in an activity that previously did no I/O.
- **Extraction adds startup latency on first launch and after upgrades** — three files totalling ~38 KB, so the cost is small, but it is on the path before the server binds.
- **The `versionCode` marker assumes monotonic version bumps.** A downgrade to an older APK carrying a lower `versionCode` would also trigger re-extraction, which is the desired behavior; a sideloaded rebuild that reuses the same `versionCode` with different assets would not. That is acceptable for release artifacts and worth knowing during development, where a clean reinstall is the reliable path.
