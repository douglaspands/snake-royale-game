# Design: Android Host & Background Game Server (v1.5.0-ANDROID-HOST)

## 1. Architecture Overview

The Android application embeds the CPython runtime using Chaquopy, running the FastAPI + Uvicorn server inside a Kotlin `ForegroundService`.

```
+-------------------------------------------------------------------------+
|                           Android Host Device                           |
|                                                                         |
|  +--------------------------+          +-----------------------------+  |
|  |       MainActivity       |          |    ServerForegroundService  |  |
|  |  - IP Discovery & Banner |          |  - Persistent Notification  |  |
|  |  - QR Code Generator     |  starts  |  - WakeLock & WifiLock      |  |
|  |  - Browser / App Launch  +--------->|  - Python CPython Runtime   |  |
|  +------------+-------------+          +--------------+--------------+  |
|               |                                       |                 |
|               v                                       v                 |
|  +--------------------------+          +-----------------------------+  |
|  |   GameWebViewActivity    |          |    FastAPI ASGI Server      |  |
|  |  - Hardware Accelerated  |  WS/HTTP |  - 30-40 Hz GameLoop        |  |
|  |  - Fullscreen Touch      +--------->|  - Static SPA (client/dist) |  |
|  +--------------------------+          |  - LAN Socket 0.0.0.0:8000  |  |
|                                        +--------------+--------------+  |
+-------------------------------------------------------|-----------------+
                                                        | Wi-Fi LAN
                                                        v
                                         +-----------------------------+
                                         |    External Mobile / PC     |
                                         |  - Scans QR Code            |
                                         |  - Connects to LAN IP       |
                                         +-----------------------------+
```

## 2. Key Components

### 2.1 ServerForegroundService
- Runs as an Android `ForegroundService` with notification channel `snake_server_channel`.
- Acquires `PowerManager.PARTIAL_WAKE_LOCK` and `WifiManager.WifiLock` (`WIFI_MODE_FULL_HIGH_PERF`).
- Spawns background thread executing `android_entry.py` -> `uvicorn.Server.serve()`.
- Notification features two action intents: "Jogar no Navegador" and "Parar Servidor".

### 2.2 NetworkHelper & QRCodeHelper
- Detects IPv4 on `wlan0` / `ap0` / tethering interfaces.
- Computes `http://<lan_ip>:8000` and generates high-contrast QR Code bitmap using lightweight matrix encoder.

### 2.3 Web Asset Synchronization & FastAPI Serving
- Web client is compiled via `npm run build` producing `client/dist`.
- Assets are packaged in `android/app/src/main/assets/client_dist/`.
- `main.py` detects `SNAKE_STATIC_DIR` environment variable or APK asset location fallback.

### 2.4 GitHub Actions CI/CD Release
- Workflow `.github/workflows/release.yml` triggered on tag `v*` or manual dispatch.
- Compiles web client, configures Java & Android SDK, builds `assembleRelease` / `assembleDebug` APK.
- Uploads `snake-royale-server.apk` to GitHub Release assets.
