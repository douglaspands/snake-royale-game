## Purpose
Autonomous Android Host Application and background server execution for Snake Battle Royale. Governs Android Foreground Service lifecycle, embedded Python ASGI server startup, local Wi-Fi IP discovery, QR Code generation, precompiled SPA asset distribution, in-app WebView / browser dispatching, and automated GitHub Release APK packaging.

## Requirements

### Requirement: REQ-AND-001 Android Foreground Service Lifecycle
The Android application MUST execute the FastAPI + Uvicorn server and Game Loop inside an Android `ForegroundService` with an ongoing, persistent system notification.

#### Scenario: Server service startup
- **WHEN** the user starts the server or launches the host application
- **THEN** the ForegroundService transitions to active state, displays a persistent notification with the server IP, and starts the Python ASGI event loop

#### Scenario: Background persistence under screen lock
- **WHEN** the host device screen is locked or the user switches to another application
- **THEN** the ForegroundService keeps running without process termination by the Android OS

#### Scenario: Clean server service shutdown
- **WHEN** the user stops the server or dismisses the service from the notification action
- **THEN** the server shuts down gracefully, releasing all socket bindings and notification resources

### Requirement: REQ-AND-002 Wi-Fi LAN IP Resolution & QR Code Generation
The Android application SHALL automatically detect active IPv4 addresses on local network interfaces (Wi-Fi `wlan0` / Hotspot tethering), display connection URLs on the dashboard, and render a dynamic QR Code for instant peer joining.

#### Scenario: Wi-Fi IP discovery and QR generation
- **WHEN** the host device is connected to a local Wi-Fi network or mobile hotspot
- **THEN** the application identifies the local IPv4 address (e.g. `192.168.1.100`), displays `http://<ip>:8000`, and renders a scannable QR Code containing the URL

#### Scenario: Network interface fallback
- **WHEN** no external Wi-Fi or tethering interface is connected
- **THEN** the application falls back to `http://localhost:8000` with an explicit notice to enable Wi-Fi or hotspot for multiplayer

### Requirement: REQ-AND-003 Bundled Static Web Assets Serving
The embedded Python server MUST package and serve the precompiled frontend distribution (`client/dist`) directly from the application package without requiring Node.js or runtime build tools on Android.

#### Scenario: SPA asset serving on Android
- **WHEN** a client or browser requests `/`, `/assets/*`, or any SPA client route on port 8000
- **THEN** the server responds with the precompiled HTML, JS, CSS, and asset files with appropriate MIME types

### Requirement: REQ-AND-004 In-App WebView and External Browser Dispatching
The Android application SHALL support dual gameplay launch modes on the host device: launching the default system browser via Android Intent, and launching a dedicated in-app hardware-accelerated WebView.

#### Scenario: Launch in external browser
- **WHEN** the user taps "Jogar no Navegador"
- **THEN** an Android Intent launches the default web browser (e.g. Chrome) navigating to `http://localhost:8000`

#### Scenario: Launch in dedicated WebView
- **WHEN** the user taps "Jogar no App"
- **THEN** the application opens a fullscreen WebView activity with hardware acceleration, JavaScript enabled, and responsive touch controls

### Requirement: REQ-AND-005 Background Power and Network Lock Retention
The ForegroundService MUST acquire a partial `WakeLock` and a `WifiLock` during active server sessions to prevent device CPU throttling and Wi-Fi interface sleep.

#### Scenario: Power lock acquisition
- **WHEN** the server service starts
- **THEN** partial WakeLock and WifiLock (WIFI_MODE_FULL_HIGH_PERF) are acquired and held for the duration of the server session

#### Scenario: Power lock release
- **WHEN** the server service stops
- **THEN** all acquired WakeLocks and WifiLocks are safely released

### Requirement: REQ-AND-006 Automated GitHub Release Pipeline & APK Asset Generation
The CI/CD pipeline on GitHub Actions MUST automatically validate tests, setup the Gradle runtime environment via `gradle/actions/setup-gradle@v4` (Gradle 8.7), compile precompiled web assets, synchronize Python backend sources to the Chaquopy source tree, compile the Android APK, and attach the `.apk` package to the GitHub Release Assets upon publishing a release or pushing a version tag.

#### Scenario: GitHub Release APK asset upload
- **WHEN** a new GitHub Release is published or a tag matching `v*` is pushed
- **THEN** GitHub Actions sets up Node 20, Python 3.12, JDK 17, Android SDK, and Gradle 8.7 via setup-gradle, validates specs, compiles the frontend bundle, syncs the Python server package, builds the Android APK, and uploads the `.apk` to the release assets
