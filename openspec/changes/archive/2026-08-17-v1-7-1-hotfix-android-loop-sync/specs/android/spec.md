## MODIFIED Requirements

### Requirement: REQ-AND-005 Background Power and Network Lock Retention
The ForegroundService MUST acquire a partial `WakeLock` and a `WifiLock` during active server sessions to prevent device CPU throttling and Wi-Fi interface sleep. The `WakeLock` MUST be held for the entire duration of the server session without a fixed expiry timeout that could allow it to silently lapse and let the device resume CPU throttling while the session is still active. The `WifiLock` MUST be acquired in a mode that is functionally effective at preventing the Wi-Fi radio from entering power-save on the Android versions the app supports — `WIFI_MODE_FULL_HIGH_PERF` alone is insufficient on API 29+, where it is a documented no-op, silently letting the radio sleep and making the embedded server unreachable from other devices on the network even though the lock reports as held.

#### Scenario: Power lock acquisition
- **WHEN** the server service starts on a device below API 29
- **THEN** partial WakeLock and WifiLock (`WIFI_MODE_FULL_HIGH_PERF`) are acquired and held for the duration of the server session

#### Scenario: Power lock survives long sessions
- **WHEN** the server session remains active longer than any fixed timeout previously used for the WakeLock
- **THEN** the WakeLock remains held and the device does not resume CPU throttling as a result of the lock lapsing

#### Scenario: WifiLock stays functional on API 29+
- **WHEN** the server service starts on a device running API 29 (Android 10) or higher
- **THEN** the WifiLock is acquired in `WIFI_MODE_FULL_LOW_LATENCY` mode instead of the non-functional `WIFI_MODE_FULL_HIGH_PERF`, so the Wi-Fi radio stays out of power-save and other devices on the network can keep reaching the embedded server for the entire session

#### Scenario: Power lock release
- **WHEN** the server service stops
- **THEN** all acquired WakeLocks and WifiLocks are safely released

## ADDED Requirements

### Requirement: REQ-AND-011 Automated Test Coverage (Unit & Instrumented)
The Android host module MUST have automated JVM unit tests covering its pure/testable logic and instrumented (on-device/emulator) tests covering its Android-framework-dependent behavior, and both MUST run in CI on every pull request without blocking or being blocked by the existing backend/frontend quality gate.

#### Scenario: Unit tests run without an emulator
- **WHEN** a pull request is opened or updated
- **THEN** the Android JVM unit test suite (`gradle testDebugUnitTest`) runs in CI and must pass, independent of any emulator or physical device

#### Scenario: Instrumented tests run on an emulator
- **WHEN** a pull request is opened or updated
- **THEN** the Android instrumented test suite (`gradle connectedDebugAndroidTest`) runs against a provisioned emulator in CI and must pass

#### Scenario: Android test jobs do not gate unrelated pipelines
- **WHEN** the Android unit or instrumented test jobs run
- **THEN** they run as independent CI jobs that do not block, and are not blocked by, the existing backend (`pytest`) or frontend (`vitest`) test jobs
