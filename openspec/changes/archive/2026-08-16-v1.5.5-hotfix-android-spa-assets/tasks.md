## 1. Node 0 — Environment & Specification Validation

- [x] 1.1 Create the hotfix branch `hotfix/1.5.5-android-spa-assets`
- [x] 1.2 Author the `android` delta spec (ADDED `REQ-AND-010`, MODIFIED `REQ-AND-003`) before touching any production code
- [x] 1.3 Run `openspec validate --specs --no-interactive` to confirm a clean baseline

## 2. Node B1 — APK Asset Extraction

- [x] 2.1 Add `AssetExtractor.kt` copying an asset subtree into application-private storage recursively via `AssetManager.list` / `open`
- [x] 2.2 Key extraction on a marker file holding the extracting `versionCode`; skip when it matches, re-extract when it differs
- [x] 2.3 Return the extracted absolute path, and the file count, so the caller can distinguish success from an empty extraction
- [x] 2.4 Call the extractor from `ServerForegroundService.startServerInternal` before `start_server`, replacing the unimplemented `filesDir/client_dist` TODO

## 3. Node B2 — Python Entry Point Ordering

- [x] 3.1 Move `from server.app.main import app` out of module scope into `start_server()`, after `SNAKE_STATIC_DIR` and `SNAKE_HOST_IP` are exported
- [x] 3.2 Confirm `resolve_static_dir()` and its candidate list are unchanged, so desktop and development behavior is identical
- [x] 3.3 Extend `server/tests/test_android_bridge.py` to assert the environment is set before the server module is imported

## 4. Node B3 — Startup Failure Observability

- [x] 4.1 Replace `e.printStackTrace()` in `ServerForegroundService` with `Log.e` on a stable tag, retaining the failure reason
- [x] 4.2 Make `startServerInternal` report success or failure instead of returning `Unit` unconditionally
- [x] 4.3 Replace the unconditional `isServerRunning = true` in `MainActivity.startServer()` with a bounded `/health` poll on a background thread, setting Online/Offline from the observed result

## 5. Node B4 — Version Metadata Synchronization

- [x] 5.1 Bump `versionCode = 5` / `versionName = "1.5.5"` in `android/app/build.gradle.kts`
- [x] 5.2 Update `openspec/config.yaml`, `package.json`, `pyproject.toml` and the README badge to 1.5.5

## 6. Node DOC — Sideload Documentation

- [x] 6.1 Document the Play Protect step required to sideload the APK, and that it is a distribution property rather than a build defect

## 7. Node INT — Quality Gates

- [x] 7.1 Run `npm test` (pytest + vitest + spec validation) and `npm run lint`
- [x] 7.2 Run `openspec validate --specs --no-interactive`
- [x] 7.3 Verify the Kotlin changes compile via the CI dry-run — no local `gradle`, `ANDROID_HOME` unset, no wrapper in `android/`

## 8. Node REL — Device Verification *(requires the user's device)*

*Not reachable from CI: no test in this repository executes Chaquopy or an Android runtime. These steps are the only proof the fix works.*

- [x] 8.1 Dry-run the release workflow and download the signed APK artifact — user-confirmed, 2026-08-16
- [x] 8.2 Install on the Samsung Galaxy S20 FE, clearing the Play Protect prompt — user-confirmed on-device, 2026-08-16
- [x] 8.3 Confirm `http://localhost:8000/health` returns healthy JSON from the device browser — user-confirmed on-device, 2026-08-16
- [x] 8.4 Confirm "Jogar no Navegador" loads the game rather than a blank page — user-confirmed on-device, 2026-08-16
- [x] 8.5 Confirm a second device on the same Wi-Fi can reach `http://<lan-ip>:8000` and join a match — user-confirmed on-device, 2026-08-16
- [x] 8.6 Confirm the dashboard shows Offline when the server genuinely fails to start — user-confirmed on-device, 2026-08-16
- [x] 8.7 Install an upgrade over 1.5.5 and confirm the served bundle is the new one, not the previous release's — user-confirmed on-device, 2026-08-16
