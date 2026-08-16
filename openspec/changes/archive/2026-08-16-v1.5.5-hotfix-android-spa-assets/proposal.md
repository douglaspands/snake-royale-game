## Why

With v1.5.4 the APK installs on the target device (a Samsung Galaxy S20 FE on Android 13; the remaining install prompt is Play Protect's sideload verification, not a build defect). The app launches, but its core function does not work: no usable QR code appears, and tapping "Jogar no Navegador" opens a blank page instead of the game.

Reading the startup path shows three defects, all pre-existing since `v1.5.0-android-host`. The Android host has never actually served the game — the failure was masked because nothing in the app reports it.

**1. The bundled SPA is never reachable.** `ServerForegroundService.startServerInternal` computes

```kotlin
// Extract assets or pass path if available
val staticDir = "${filesDir.absolutePath}/client_dist"
```

and passes that path to Python. The comment is an unimplemented TODO: nothing copies `assets/client_dist/` out of the APK, and APK assets are not filesystem paths — they are only reachable through `AssetManager`. The directory therefore never exists. Inspection of the published APK confirms the SPA *is* bundled (`assets/client_dist/index.html`, plus one JS and one CSS chunk), so the payload is present and merely unreachable.

Every one of the seven candidates in `resolve_static_dir()` then misses, it returns `None`, and `serve_spa` falls back to a minimal HTML document containing an empty `<canvas>` and **no `<script>` tag at all**. That fallback is exactly what the user sees: a blank page. This violates `REQ-AND-003`, which has required bundled asset serving since v1.5.0.

**2. `SNAKE_STATIC_DIR` is exported after it is read.** `android_entry.py` does `from server.app.main import app` at module scope, and `server/app/main.py` calls `build_routes()` → `resolve_static_dir()` at import time. Kotlin's `getModule("android_entry")` therefore resolves the static directory *before* `start_server()` runs and sets the environment variable. The `Mount("/assets", ...)` route is consequently never created, so fixing defect 1 alone would still leave asset requests served only by the catch-all.

**3. Startup failures are silent, and the UI reports success unconditionally.** `startServerInternal` wraps everything in `catch (e: Exception) { e.printStackTrace() }`, so a Chaquopy start failure, a Python import error, or a bind error all vanish into logcat. Meanwhile `MainActivity.startServer()` sets `isServerRunning = true` and paints the status "Online" without observing anything. The dashboard asserts the server is up regardless of what happened — which is why three broken releases shipped without the defect being visible on the device.

## What Changes

- Add an asset extraction step that copies `assets/client_dist/` out of the APK into `filesDir/client_dist` via `AssetManager`, recursively, before the Python server starts. Extraction is idempotent and re-runs when `versionCode` changes, so an upgrade never serves a previous release's bundle.
- Set `SNAKE_STATIC_DIR` and `SNAKE_HOST_IP` before importing `server.app.main`, by moving the import inside `start_server()`. The route table is then built against the resolved directory and the `/assets` mount exists.
- Surface startup failures: `startServerInternal` reports success or failure instead of swallowing exceptions, logs through `Log.e` with a tag, and records the failure reason.
- Make the dashboard reflect reality: `MainActivity` verifies the server by polling `/health` off the main thread and sets Online/Offline from the result, rather than asserting Online unconditionally.
- Document the Play Protect step required to sideload the APK.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `android`: Add `REQ-AND-010` (Embedded Server Startup Observability), requiring startup failures to be logged and reflected in the dashboard rather than silently swallowed. Update `REQ-AND-003` (Bundled Static Web Assets Serving) to specify extraction from the APK to application storage and the ordering constraint that the static directory must be resolved before the route table is built.

## Impact

- **Affected Files**:
  - `android/app/src/main/java/com/snakeroyale/host/ServerForegroundService.kt`
  - `android/app/src/main/java/com/snakeroyale/host/AssetExtractor.kt` *(new)*
  - `android/app/src/main/java/com/snakeroyale/host/MainActivity.kt`
  - `android/app/src/main/python/android_entry.py`
  - `server/tests/test_android_bridge.py`
  - `android/app/build.gradle.kts` (version identity)
  - `openspec/config.yaml`, `package.json`, `pyproject.toml`, `README.md`
- **Deliberately Out of Scope**: `QRCodeHelper` produces a bitmap that no scanner can decode — it writes no Reed-Solomon error-correction codewords, never fills the format-information area it reserves, and omits the dark module and quiet zone. That is a missing encoder rather than a bug to patch, and it is tracked as separate work so this change stays focused on making the server serve the game.
- **Zero Breaking API Changes**: the game protocol, WebSocket interfaces, frontend client and server game loop are untouched. `resolve_static_dir()` keeps its existing candidate list, so desktop and development behavior is unchanged.
