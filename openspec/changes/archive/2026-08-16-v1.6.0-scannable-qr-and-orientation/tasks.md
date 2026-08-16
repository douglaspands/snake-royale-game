## 1. Node 0 — Environment & Specification Validation

- [x] 1.1 Create the branch `feature/1.6.0-scannable-qr-and-orientation`
- [x] 1.2 Author the `android` delta spec (MODIFIED `REQ-AND-002`, `REQ-AND-004`) before touching production code
- [x] 1.3 Confirm the client needs no change: canvas sized from `window.innerWidth`/`innerHeight` on `resize`, HUD corner-anchored, radar scaled by `min(130, width * 0.22)`, no landscape media query
- [x] 1.4 Run `openspec validate --specs --no-interactive` on a clean baseline

## 2. Node B1 — Conformant QR Code Generation

- [x] 2.1 Add `com.google.zxing:core:3.5.3` to the `:app` dependencies
- [x] 2.2 Replace the hand-rolled matrix generator in `QRCodeHelper` with `QRCodeWriter`, requesting error correction level M, a four-module quiet zone, and UTF-8
- [x] 2.3 Render the resulting `BitMatrix` via `Bitmap.setPixels` in one call rather than per-pixel `setPixel`
- [x] 2.4 Expose whether a URL is worth encoding, so the caller can suppress a loopback QR

## 3. Node B2 — Loopback Suppression on the Dashboard

- [x] 3.1 In `MainActivity.refreshNetworkInfo`, hide the QR image and show the Wi-Fi guidance when the resolved URL is a loopback address
- [x] 3.2 Restore the QR when a LAN address becomes available on `onResume`
- [x] 3.3 Add the guidance string resource

## 4. Node B3 — Portrait & Landscape Support

- [x] 4.1 Change `android:screenOrientation` from `sensorLandscape` to `fullSensor` for `GameWebViewActivity` in `AndroidManifest.xml`
- [x] 4.2 Change `requestedOrientation` from `SCREEN_ORIENTATION_SENSOR_LANDSCAPE` to `SCREEN_ORIENTATION_FULL_SENSOR`
- [x] 4.3 Confirm `configChanges="orientation|screenSize|keyboardHidden"` remains declared, so rotation resizes in place and the WebSocket session survives
- [x] 4.4 Confirm `hideSystemUI` is re-applied after rotation so fullscreen is not lost

## 5. Node B4 — Version Metadata Synchronization

- [x] 5.1 Bump `versionCode = 6` / `versionName = "1.6.0"` in `android/app/build.gradle.kts`
- [x] 5.2 Update `openspec/config.yaml`, `package.json`, `pyproject.toml` and the README badge to 1.6.0

## 6. Node INT — Quality Gates

- [x] 6.1 Run `npm test` and `npm run lint`
- [x] 6.2 Run `openspec validate --specs --no-interactive`
- [x] 6.3 Verify compilation via the CI dry-run — no local `gradle`, `ANDROID_HOME` unset, no wrapper in `android/`

## 7. Node REL — Device Verification *(requires the user's devices)*

*Neither item is provable from CI: a QR is proven by scanning it with a second device, portrait by rotating a real phone.*

- [x] 7.1 Dry-run the release workflow and download the signed APK — user-confirmed, 2026-08-16
- [x] 7.2 Install over 1.5.5 and confirm the in-place update succeeds — user-confirmed on-device, 2026-08-16
- [x] 7.3 Scan the dashboard QR with a second device and confirm it surfaces `http://<ip>:8000` as an openable URL — user-confirmed on-device, 2026-08-16
- [x] 7.4 Open that URL on the second device and confirm it joins the match — user-confirmed on-device, 2026-08-16
- [x] 7.5 Disable Wi-Fi and confirm the QR is replaced by the guidance notice rather than encoding localhost — user-confirmed on-device, 2026-08-16
- [x] 7.6 Launch "Jogar no App" in portrait and confirm the game renders with HUD and controls inside the viewport — user-confirmed on-device, 2026-08-16
- [x] 7.7 Rotate during an active match and confirm the session survives — no reload, no disconnect, canvas resized — user-confirmed on-device, 2026-08-16
