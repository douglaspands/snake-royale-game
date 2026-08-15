## Why
To enable Snake Battle Royale to run autonomously as a portable mobile game server and client on Android devices, allowing the host device to run the game in the background, discover and broadcast the local Wi-Fi IP (and QR Code) to other devices on the LAN, play locally via web browser or in-app WebView, and distribute standalone `.apk` releases automatically through GitHub Releases.

## What Changes
- Standalone Android project (`android/`) with Gradle and Chaquopy embedding Python 3.12 ASGI runtime.
- Background `ForegroundService` with persistent notification, `WakeLock`, and `WifiLock` for uninterrupted execution.
- Native Android Dashboard UI (`MainActivity`) with real-time LAN IP resolution, dynamic QR Code generation, and one-tap controls ("Jogar no Navegador", "Jogar no App", "Compartilhar Link").
- Hardware-accelerated fullscreen `GameWebViewActivity` with multi-touch and virtual joystick support.
- Precompiled web assets (`client/dist`) synchronization into the APK bundle.
- Automated GitHub Actions Release workflow (`.github/workflows/release.yml`) compiling the APK and attaching it to GitHub Release Assets.

## Capabilities

### New Capabilities
- `android`: Android Foreground Service lifecycle, local Wi-Fi IP discovery, QR Code generation, bundled static web asset serving, in-app WebView / browser dispatching, and automated GitHub Release APK packaging.

### Modified Capabilities
- `protocol`: Integration points for mobile host and LAN clients.

## Impact
- New `android/` directory containing complete native Android Studio / Gradle project.
- New `.github/workflows/release.yml` for automated APK generation on release.
- Updated `server/app/main.py` and `server/app/network_utils.py` with multi-environment static asset resolution.
- Updated `package.json` with Android helper commands (`android:sync-client`, `android:build`).
