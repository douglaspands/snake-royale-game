## Purpose
Autonomous Android Host Application and background server execution for Snake Battle Royale. Governs Android Foreground Service lifecycle, embedded Python ASGI server startup, local Wi-Fi IP discovery, QR Code generation, precompiled SPA asset distribution, in-app WebView / browser dispatching, and automated GitHub Release APK packaging.

## Requirements

### Requirement: REQ-AND-001 Android Foreground Service Lifecycle
The Android application MUST execute the Starlette + Uvicorn server and Game Loop inside an Android `ForegroundService` with an ongoing, persistent system notification.

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
The CI/CD pipeline on GitHub Actions MUST automatically validate tests, setup the Gradle runtime environment via `gradle/actions/setup-gradle` (Gradle 8.7), compile precompiled web assets, synchronize Python backend sources to the Chaquopy source tree via the Kotlin-DSL-compliant `chaquopy { }` configuration block, compile the Android APK for the ABI matrix defined in `REQ-AND-007`, and attach the `.apk` package to the GitHub Release Assets upon publishing a GitHub Release. Every GitHub Action referenced by the workflow MUST be pinned to a major version whose `action.yml` declares a supported Node runtime (`node24`), so the pipeline produces no runtime deprecation annotations. The APK's `versionCode` and `versionName` MUST be kept in sync with the published release tag.

#### Scenario: GitHub Release APK asset upload
- **WHEN** a new GitHub Release is published
- **THEN** GitHub Actions sets up Node, Python 3.12, JDK 17, Android SDK, and Gradle 8.7 via setup-gradle, validates specs, compiles the frontend bundle, syncs the Python server package, builds the Android APK using the `chaquopy { defaultConfig { ... }; sourceSets { ... } }` Kotlin DSL block for the `arm64-v8a` and `x86_64` ABIs, and uploads the `.apk` to the release assets

#### Scenario: No duplicate release run from tag push
- **WHEN** publishing a GitHub Release creates its underlying git tag
- **THEN** the release workflow triggers exactly once (from the `release` event only), and does not also trigger a second, duplicate run from a `push` tag event

#### Scenario: Release build verified before tagging
- **GIVEN** a hotfix branch containing Android build configuration changes
- **WHEN** the release workflow is dispatched manually via `workflow_dispatch` against that branch
- **THEN** the APK is compiled end to end, and the upload step is skipped because the ref is not a tag and the event is not `release`, leaving all published release assets untouched

#### Scenario: Server source synchronization is wired into the task graph
- **GIVEN** the `syncServerSources` task copies `server/` into `android/app/src/main/python/server`, a directory Chaquopy consumes as a Python source root
- **WHEN** Gradle validates the task graph for `assembleDebug`
- **THEN** the Chaquopy `merge<Variant>PythonSources` tasks MUST declare an explicit dependency on `syncServerSources`, so Gradle reports no implicit-dependency validation problem and the sources are always copied before they are merged

#### Scenario: Every manifest-declared resource resolves at link time
- **GIVEN** `AndroidManifest.xml` declares `android:icon="@mipmap/ic_launcher"` and `android:roundIcon="@mipmap/ic_launcher_round"`
- **WHEN** the `:app:processDebugResources` task links the application resources
- **THEN** both mipmaps MUST exist for every standard density bucket (mdpi through xxxhdpi), so AAPT reports no `resource not found` error and the APK ships with a launcher icon

#### Scenario: Workflow runs free of runtime deprecation warnings
- **WHEN** any job in the release workflow completes
- **THEN** the run reports no `Node.js 20 is deprecated` annotation, because every referenced action resolves to a `node24` runtime

### Requirement: REQ-AND-007 Supported CPU Architecture (ABI) Matrix
The Android host application MUST be compiled exclusively for the `arm64-v8a` and `x86_64` ABIs. The `android.defaultConfig.ndk.abiFilters` declaration MUST NOT include any ABI for which the Chaquopy plugin does not publish a runtime matching the configured `chaquopy.defaultConfig.version`, and that configured Python version MUST satisfy the `requires-python` constraint declared by the backend in `pyproject.toml`.

#### Scenario: Gradle configuration succeeds with a compatible ABI set
- **GIVEN** `abiFilters` is declared as `listOf("arm64-v8a", "x86_64")` and `chaquopy.defaultConfig.version` is `"3.12"`
- **WHEN** Gradle evaluates the `:app` project and the Chaquopy plugin runs its `afterVariant` hook
- **THEN** `com.chaquo.python.PythonPlugin.getAbis` resolves a runtime for every requested ABI, the configuration phase completes without a `GradleException`, and task execution proceeds to `assembleDebug`

#### Scenario: Unsupported 32-bit ABI is rejected at configuration time
- **GIVEN** `abiFilters` includes `armeabi-v7a` while `chaquopy.defaultConfig.version` is `"3.12"`
- **WHEN** Gradle evaluates the `:app` project
- **THEN** the build fails during configuration with `Python 3.12 is not available for the ABI 'armeabi-v7a'`, and this configuration MUST NOT be committed to the repository

#### Scenario: Embedded Python runtime tracks the backend target
- **GIVEN** `pyproject.toml` declares `requires-python = ">=3.12"` and the CI backend gate runs on Python 3.12
- **WHEN** the Chaquopy Python version bundled into the APK is selected
- **THEN** it MUST be a version satisfying that same constraint, so the server executes on the interpreter its test and type gates validated

### Requirement: REQ-AND-008 Pure-Python Dependency Constraint for the Embedded Server
Every Python package bundled into the Android host APK via the Chaquopy `pip { install(...) }` block MUST be installable as a pure-Python wheel, or be a native package for which Chaquopy publishes a prebuilt wheel. The server MUST NOT depend, directly or transitively, on a native extension absent from the Chaquopy package repository. Test-only dependencies MUST be declared in the `dev` dependency group of `pyproject.toml` and MUST NOT appear in the Chaquopy install list.

#### Scenario: Server runtime dependencies resolve to pure-Python wheels
- **GIVEN** the Chaquopy install list declares `starlette`, `uvicorn` and `websockets`
- **WHEN** the `:app:generateDebugPythonRequirements` task resolves the dependency tree
- **THEN** every package resolves to a `py3-none-any` wheel, no source distribution requires a compiler toolchain, and the task completes successfully

#### Scenario: Pydantic-backed validation layer is excluded
- **GIVEN** `pydantic` v2 requires the Rust extension `pydantic-core`, for which Chaquopy publishes no wheel
- **WHEN** the server's HTTP and WebSocket layer is implemented
- **THEN** it MUST target Starlette directly rather than FastAPI, so that no pydantic dependency enters the tree and the backend and the APK run the identical dependency set

#### Scenario: Test-only dependencies stay out of the APK
- **GIVEN** `jsonschema` is used exclusively by `server/tests/harness/schema_validator.py` and pulls the Rust extension `rpds-py`
- **WHEN** the Android APK dependency list is assembled
- **THEN** `jsonschema` is absent from the Chaquopy `pip` block and declared only in the `dev` dependency group, leaving the packet-schema test gate fully functional in CI
