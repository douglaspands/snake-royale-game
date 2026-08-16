## Why

With `v1.5.5` the embedded server starts and the SPA loads on the device, so the host is functional for the first time. Two problems remain on the paths that make it usable by other players.

**The QR Code cannot be scanned.** `QRCodeHelper` was deferred from `v1.5.5` and is now confirmed against real devices: peers point a camera at the dashboard and nothing is detected. The generator draws a symbol that *looks* like a QR Code while omitting most of what makes one decodable:

- No Reed-Solomon error-correction codewords. The bit stream is padded to the full 70-codeword capacity of a Version 3-L symbol with data and pad bytes, but Version 3-L is 55 data codewords **plus 15 error-correction codewords**. There are none, so every reader's error-correction stage rejects the symbol.
- The format-information area is reserved and never written. Readers consult it first to learn the error-correction level and mask pattern; the reserved modules stay light, which is not a valid format pattern.
- No dark module at `(4 × version + 9, 8)`, mandatory for every symbol.
- No quiet zone. The bitmap is rendered edge to edge, while the specification requires a four-module light margin for the finder patterns to be located at all.

Mask 0 is applied to the data but never recorded in the format information, so even a reader that got past the above would demask incorrectly. This is a missing encoder rather than a defect to patch.

**The in-app game is locked to landscape.** `GameWebViewActivity` sets `SCREEN_ORIENTATION_SENSOR_LANDSCAPE` in `onCreate`, and `AndroidManifest.xml` declares `android:screenOrientation="sensorLandscape"`. Playing in portrait is impossible even though nothing in the client requires landscape: `main.ts` sizes the canvas from `window.innerWidth`/`innerHeight` on every `resize`, the HUD is corner-anchored, the radar already scales with `Math.min(130, screenWidth * 0.22)`, and the only CSS media query is a `min-width: 900px` rule that hides the mobile turbo button on desktop. The lock is the sole obstacle.

## What Changes

- Replace the hand-rolled `QRCodeHelper` matrix generator with ZXing's encoder, producing a specification-conformant symbol with error correction, format information, dark module and quiet zone.
- Suppress the QR Code when the resolved URL is a loopback address, showing the "enable Wi-Fi or hotspot" notice instead — a QR encoding `http://localhost:8000` points a scanning device at itself and is worse than no QR at all.
- Unlock the in-app WebView orientation: `fullSensor` in the manifest and `SCREEN_ORIENTATION_FULL_SENSOR` in the activity. `configChanges` already covers `orientation|screenSize|keyboardHidden`, so rotation resizes the WebView in place without recreating the activity or dropping the WebSocket session.
- Add `com.google.zxing:core:3.5.3` (pure Java, no native component, no Android dependency) to the app module.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `android`: Update `REQ-AND-002` (Wi-Fi LAN IP Resolution & QR Code Generation) to require an ISO/IEC 18004 conformant symbol that decodes on a peer device, and to forbid presenting a QR Code for a loopback address. Update `REQ-AND-004` (In-App WebView and External Browser Dispatching) to require both portrait and landscape support, with rotation handled without recreating the activity.

## Impact

- **Affected Files**:
  - `android/app/src/main/java/com/snakeroyale/host/QRCodeHelper.kt`
  - `android/app/src/main/java/com/snakeroyale/host/MainActivity.kt`
  - `android/app/src/main/java/com/snakeroyale/host/GameWebViewActivity.kt`
  - `android/app/src/main/AndroidManifest.xml`
  - `android/app/build.gradle.kts` (ZXing dependency, version identity)
  - `android/app/src/main/res/values/strings.xml`
  - `openspec/config.yaml`, `package.json`, `pyproject.toml`, `README.md`
- **New Dependency**: `com.google.zxing:core:3.5.3` — the reference QR implementation, pure Java with no Android or native dependency, ~530 KB before shrinking. It is a build-time addition to the Android module only and does not touch the Chaquopy dependency set, so `REQ-AND-008` is unaffected.
- **No Client Changes**: the web client already adapts to any viewport; portrait support requires no frontend work, and none is done here.
- **Zero Breaking API Changes**: game protocol, WebSocket interfaces, server and game loop untouched. No Python source is modified.
