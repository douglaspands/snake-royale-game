## ADDED Requirements

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

## MODIFIED Requirements

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
