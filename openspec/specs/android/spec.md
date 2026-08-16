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
The Android application SHALL automatically detect active IPv4 addresses on local network interfaces (Wi-Fi `wlan0` / Hotspot tethering), display connection URLs on the dashboard, and render a dynamic QR Code for instant peer joining. The QR Code MUST be a specification-conformant ISO/IEC 18004 symbol — carrying Reed-Solomon error-correction codewords, written format information, the dark module, and a quiet zone of at least four modules — so that a standard camera application on another device decodes it and offers the encoded URL for opening. The application MUST NOT present a QR Code encoding a loopback address, because such a symbol is undecodable into a usable destination by any other device.

#### Scenario: Wi-Fi IP discovery and QR generation
- **WHEN** the host device is connected to a local Wi-Fi network or mobile hotspot
- **THEN** the application identifies the local IPv4 address (e.g. `192.168.1.100`), displays `http://<ip>:8000`, and renders a scannable QR Code containing the URL

#### Scenario: QR Code decodes on a peer device
- **GIVEN** the dashboard displays a QR Code for a LAN URL
- **WHEN** another device points a standard camera or QR reader application at it
- **THEN** the reader MUST decode the symbol and surface `http://<ip>:8000` as an openable URL

#### Scenario: Loopback address suppresses the QR Code
- **GIVEN** no Wi-Fi or tethering interface is available, so the resolved URL is a loopback address
- **WHEN** the dashboard renders
- **THEN** the QR Code MUST be replaced by an explicit notice to enable Wi-Fi or a hotspot, rather than presenting a symbol that resolves to the scanning device itself

#### Scenario: Network interface fallback
- **WHEN** no external Wi-Fi or tethering interface is connected
- **THEN** the application falls back to `http://localhost:8000` with an explicit notice to enable Wi-Fi or hotspot for multiplayer

### Requirement: REQ-AND-003 Bundled Static Web Assets Serving
The embedded Python server MUST package and serve the precompiled frontend distribution (`client/dist`) directly from the application package without requiring Node.js or runtime build tools on Android. Because APK assets are not addressable as filesystem paths, the host application MUST extract the bundled `assets/client_dist/` tree into application-private storage before starting the server, and MUST pass the resulting absolute path to the Python entry point. Extraction MUST be idempotent across launches and MUST re-run when the application `versionCode` changes, so an upgraded install never serves a previous release's bundle. The static directory MUST be resolved before the server's route table is built, so that the assets mount is present in the route table.

#### Scenario: SPA asset serving on Android
- **WHEN** a client or browser requests `/`, `/assets/*`, or any SPA client route on port 8000
- **THEN** the server responds with the precompiled HTML, JS, CSS, and asset files with appropriate MIME types

#### Scenario: Bundled assets are extracted before the server starts
- **GIVEN** a freshly installed application whose private storage contains no extracted bundle
- **WHEN** the foreground service starts the embedded server
- **THEN** the contents of `assets/client_dist/` MUST be copied recursively into application-private storage, and the absolute path of that directory MUST be passed to `start_server` before the server begins listening

#### Scenario: Extraction re-runs after an application upgrade
- **GIVEN** application-private storage holds a bundle extracted by an earlier `versionCode`
- **WHEN** the service starts after the application has been upgraded
- **THEN** the bundle MUST be re-extracted, so the served SPA matches the installed APK rather than the previous release

#### Scenario: Static directory is resolved before the route table is built
- **GIVEN** `server/app/main.py` calls `resolve_static_dir()` while building its route table at import time
- **WHEN** the Android entry point starts the server with a static directory
- **THEN** `SNAKE_STATIC_DIR` MUST already be set in the environment at the moment `server.app.main` is imported, so the `/assets` mount is present in the resulting route table

#### Scenario: Missing bundle degrades to a diagnosable state
- **GIVEN** the extraction step failed or produced no files
- **WHEN** a browser requests the SPA root
- **THEN** the server MUST still respond, and the failure MUST be visible in the dashboard status and the application log rather than presenting a blank page with no explanation

### Requirement: REQ-AND-004 In-App WebView and External Browser Dispatching
The Android application SHALL support dual gameplay launch modes on the host device: launching the default system browser via Android Intent, and launching a dedicated in-app hardware-accelerated WebView. The in-app WebView activity MUST support both portrait and landscape orientations, following the device sensor, and MUST NOT lock the display to landscape. Orientation changes MUST be handled without recreating the activity, so that the WebView is not reloaded and the active match is not interrupted. The in-app WebView MUST honour the viewport declared by the loaded document at a page scale of 1.0, filling the activity window; it MUST NOT emulate a wide layout viewport nor scale the page down to fit its contents, so that the game occupies the same proportion of the display as it does in the system browser.

#### Scenario: Launch in external browser
- **WHEN** the user taps "Jogar no Navegador"
- **THEN** an Android Intent launches the default web browser (e.g. Chrome) navigating to `http://localhost:8000`

#### Scenario: Launch in dedicated WebView
- **WHEN** the user taps "Jogar no App"
- **THEN** the application opens a fullscreen WebView activity with hardware acceleration, JavaScript enabled, and responsive touch controls

#### Scenario: In-app game fills the display at native scale
- **GIVEN** the bundled SPA declares `width=device-width, initial-scale=1.0`
- **WHEN** the user launches the in-app WebView
- **THEN** the page scale MUST be 1.0, the rendered game MUST span the full width and height of the activity window with no surrounding margin, and it MUST NOT be shrunk to fit

#### Scenario: Gameplay in portrait orientation
- **GIVEN** the device is held in portrait and auto-rotate is enabled
- **WHEN** the user launches the in-app WebView
- **THEN** the game MUST render in portrait, the canvas MUST fill the viewport, and the HUD corners and touch controls MUST remain within the visible area

#### Scenario: Rotation during an active match preserves session
- **GIVEN** a match is in progress in the in-app WebView
- **WHEN** the user rotates the device between portrait and landscape
- **THEN** the activity MUST NOT be recreated, the WebView MUST NOT reload, the WebSocket session MUST stay connected, and the canvas MUST resize to the new viewport

### Requirement: REQ-AND-005 Background Power and Network Lock Retention
The ForegroundService MUST acquire a partial `WakeLock` and a `WifiLock` during active server sessions to prevent device CPU throttling and Wi-Fi interface sleep.

#### Scenario: Power lock acquisition
- **WHEN** the server service starts
- **THEN** partial WakeLock and WifiLock (WIFI_MODE_FULL_HIGH_PERF) are acquired and held for the duration of the server session

#### Scenario: Power lock release
- **WHEN** the server service stops
- **THEN** all acquired WakeLocks and WifiLocks are safely released

### Requirement: REQ-AND-006 Automated GitHub Release Pipeline & APK Asset Generation
The CI/CD pipeline on GitHub Actions MUST automatically validate tests, setup the Gradle runtime environment via `gradle/actions/setup-gradle` (Gradle 8.7), compile precompiled web assets, synchronize Python backend sources to the Chaquopy source tree via the Kotlin-DSL-compliant `chaquopy { }` configuration block, compile the Android APK for the ABI matrix defined in `REQ-AND-007` using the `release` variant with the signing configuration defined in `REQ-AND-009`, verify the resulting artifact's signer and debuggable flag before publication, and attach the `.apk` package together with a `.sha256` checksum file to the GitHub Release Assets upon publishing a GitHub Release. Every GitHub Action referenced by the workflow MUST be pinned to a major version whose `action.yml` declares a supported Node runtime (`node24`), so the pipeline produces no runtime deprecation annotations. The APK's `versionCode` and `versionName` MUST be kept in sync with the published release tag.

#### Scenario: GitHub Release APK asset upload
- **WHEN** a new GitHub Release is published
- **THEN** GitHub Actions sets up Node, Python 3.12, JDK 17, Android SDK, and Gradle 8.7 via setup-gradle, validates specs, compiles the frontend bundle, syncs the Python server package, builds the signed release APK using the `chaquopy { defaultConfig { ... }; sourceSets { ... } }` Kotlin DSL block for the `arm64-v8a` and `x86_64` ABIs, and uploads the `.apk` and its `.sha256` checksum to the release assets

#### Scenario: Debug artifact is rejected before upload
- **GIVEN** the build produced an APK signed by `CN=Android Debug`, or one whose badging reports `application-debuggable`
- **WHEN** the pipeline reaches the artifact verification step
- **THEN** the job MUST fail with an explicit message naming the offending property, and the upload step MUST NOT run

#### Scenario: Signing key material is provided by repository secrets
- **GIVEN** the repository defines the secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`
- **WHEN** the release job runs
- **THEN** the keystore is decoded from base64 to a file outside version control, the passwords are passed to Gradle through the process environment rather than written to any file in the workspace, and no secret value is echoed to the job log

#### Scenario: No duplicate release run from tag push
- **WHEN** publishing a GitHub Release creates its underlying git tag
- **THEN** the release workflow triggers exactly once (from the `release` event only), and does not also trigger a second, duplicate run from a `push` tag event

#### Scenario: Release build verified before tagging
- **GIVEN** a hotfix branch containing Android build configuration changes
- **WHEN** the release workflow is dispatched manually via `workflow_dispatch` against that branch
- **THEN** the APK is compiled end to end, and the upload step is skipped because the ref is not a tag and the event is not `release`, leaving all published release assets untouched

#### Scenario: Server source synchronization is wired into the task graph
- **GIVEN** the `syncServerSources` task copies `server/` into `android/app/src/main/python/server`, a directory Chaquopy consumes as a Python source root
- **WHEN** Gradle validates the task graph for `assembleRelease`
- **THEN** the Chaquopy `merge<Variant>PythonSources` tasks MUST declare an explicit dependency on `syncServerSources`, so Gradle reports no implicit-dependency validation problem and the sources are always copied before they are merged

#### Scenario: Every manifest-declared resource resolves at link time
- **GIVEN** `AndroidManifest.xml` declares `android:icon="@mipmap/ic_launcher"` and `android:roundIcon="@mipmap/ic_launcher_round"`
- **WHEN** the `:app:processReleaseResources` task links the application resources
- **THEN** both mipmaps MUST exist for every standard density bucket (mdpi through xxxhdpi), so AAPT reports no `resource not found` error and the APK ships with a launcher icon

#### Scenario: Workflow runs free of runtime deprecation warnings
- **WHEN** any job in the release workflow completes
- **THEN** the run reports no `Node.js 20 is deprecated` annotation, because every referenced action resolves to a `node24` runtime

### Requirement: REQ-AND-009 Release APK Signing & Device Installability
The APK attached to a GitHub Release MUST be built from the `release` variant and MUST be signed with a persistent project keystore whose credentials are supplied at build time from the environment or from an unversioned `android/keystore.properties`. The signing configuration MUST enable the v2 and v3 signature schemes. It MUST NOT require the v1 (JAR) scheme, which carries no benefit at `minSdk 24` and which AGP omits at that level regardless of configuration. The published APK MUST NOT be debuggable, MUST NOT carry a debug `applicationIdSuffix`, and MUST NOT be signed by the AGP-generated debug certificate. The keystore MUST NOT be committed to the repository, and `.gitignore` MUST exclude `*.keystore`, `*.jks` and `android/keystore.properties`. The signing identity MUST remain stable across releases so that a newer version installs over an older one in place.

#### Scenario: Published APK is a signed, non-debuggable release build
- **GIVEN** the release workflow ran with the signing secrets configured
- **WHEN** the published APK is inspected with `apksigner verify --print-certs` and `aapt dump badging`
- **THEN** the signer subject MUST NOT be `CN=Android Debug`, the v2 and v3 schemes MUST both report as verified, the package name MUST be `com.snakeroyale.host` with no `.debug` suffix, and the badging output MUST NOT report `application-debuggable`

#### Scenario: Clean installation on a supported device
- **GIVEN** a device running Android 13 on the `arm64-v8a` ABI with no prior version of the application installed
- **WHEN** the user installs the published APK by sideload
- **THEN** installation completes successfully without requiring the user to disable Play Protect or any other device protection

#### Scenario: In-place update over the previous release
- **GIVEN** a device with release version N of the application installed
- **WHEN** the user installs release version N+1, signed with the same project keystore and carrying a strictly greater `versionCode`
- **THEN** the installation succeeds as an update, without `INSTALL_FAILED_UPDATE_INCOMPATIBLE` and without requiring the user to uninstall version N first

#### Scenario: Build degrades gracefully without signing credentials
- **GIVEN** a developer clone with no signing environment variables and no `android/keystore.properties`
- **WHEN** Gradle configures the `:app` project and runs `assembleDebug`
- **THEN** the configuration phase completes without error, no `signingConfig` is attached to the `release` build type, and the debug build succeeds

#### Scenario: Release keystore is never committed
- **WHEN** the repository working tree is inspected at any commit on the default branch
- **THEN** no `*.jks`, `*.keystore` or `android/keystore.properties` file is tracked by git

### Requirement: REQ-AND-010 Embedded Server Startup Observability
The Android host MUST NOT report the embedded server as running unless it has been observed to respond. Any failure to start the Python runtime, import the server entry point, or bind the listening socket MUST be logged through the Android logging framework with a stable tag, and MUST be reflected in the dashboard status. The service MUST NOT swallow a startup exception into a bare stack-trace print.

#### Scenario: Startup failure is reported rather than swallowed
- **GIVEN** the Python runtime fails to start, or `android_entry` raises during import
- **WHEN** `ServerForegroundService` attempts to start the server
- **THEN** the exception MUST be logged via `Log.e` with the service tag and the failure reason retained, and the dashboard MUST show the offline status

#### Scenario: Dashboard status reflects an observed server
- **WHEN** the user starts the server from the dashboard
- **THEN** the status MUST be set from an actual observation of the running server — a successful response from the `/health` endpoint — and MUST NOT be set to online merely because a start was requested

#### Scenario: Health endpoint is reachable independently of static assets
- **GIVEN** the server is running and the static asset directory is missing or empty
- **WHEN** a client requests `/health`
- **THEN** the server MUST respond successfully, so that server liveness can be diagnosed separately from asset serving

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
