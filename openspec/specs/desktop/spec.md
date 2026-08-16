## Purpose
Cross-platform desktop distribution of the embedded server as a standalone executable for Linux, Windows and macOS, launched outside Android or a manual Node.js/Python development environment.

## Requirements

### Requirement: REQ-DESK-001 Desktop Executable Entry Point
The desktop entry point MUST start the embedded Starlette/Uvicorn server bound to all network interfaces (`0.0.0.0`) on port 8000, serving the bundled `client/dist` SPA, without requiring Node.js, a Python interpreter, or any manual setup on the end-user machine. Once the server is observed to respond successfully on its `/health` endpoint, the entry point MUST open the host operating system's default web browser to `http://localhost:8000`. The entry point MUST NOT open the browser before the server is confirmed ready.

#### Scenario: Launching the executable opens a working game
- **GIVEN** a user double-clicks the desktop executable
- **WHEN** the embedded server responds successfully on `/health`
- **THEN** the default web browser opens automatically to `http://localhost:8000` and the SPA loads and is playable

#### Scenario: LAN players can join a desktop-hosted match
- **GIVEN** the desktop executable is running on a machine connected to a local network
- **WHEN** a second device on the same network navigates to the host machine's LAN IP on port 8000
- **THEN** it joins the same match, consistent with the server binding all network interfaces

### Requirement: REQ-DESK-002 Cross-Platform Packaged Release Artifacts
The CI/CD release pipeline MUST build a single-file executable for Linux, Windows and macOS via PyInstaller from the same codebase validated by the automated test gates, and MUST attach each executable together with a `.sha256` checksum file to the GitHub Release assets alongside the Android APK. The executables MUST NOT require a code-signing certificate or notarization to build or publish successfully.

#### Scenario: Release publishes desktop binaries for all three operating systems
- **WHEN** a new GitHub Release is published
- **THEN** the pipeline attaches one executable and one `.sha256` checksum file each for Linux, Windows and macOS, alongside the existing Android `.apk` and its checksum

#### Scenario: Unsigned executables are documented, not hidden
- **GIVEN** the published executables carry no code signature
- **WHEN** a user opens one on Windows or macOS for the first time
- **THEN** `README.md` documents the exact steps to bypass the resulting SmartScreen or Gatekeeper warning
