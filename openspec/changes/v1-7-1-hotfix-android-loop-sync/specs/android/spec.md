## MODIFIED Requirements

### Requirement: REQ-AND-005 Background Power and Network Lock Retention
The ForegroundService MUST acquire a partial `WakeLock` and a `WifiLock` during active server sessions to prevent device CPU throttling and Wi-Fi interface sleep. The `WakeLock` MUST be held for the entire duration of the server session without a fixed expiry timeout that could allow it to silently lapse and let the device resume CPU throttling while the session is still active.

#### Scenario: Power lock acquisition
- **WHEN** the server service starts
- **THEN** partial WakeLock and WifiLock (WIFI_MODE_FULL_HIGH_PERF) are acquired and held for the duration of the server session

#### Scenario: Power lock survives long sessions
- **WHEN** the server session remains active longer than any fixed timeout previously used for the WakeLock
- **THEN** the WakeLock remains held and the device does not resume CPU throttling as a result of the lock lapsing

#### Scenario: Power lock release
- **WHEN** the server service stops
- **THEN** all acquired WakeLocks and WifiLocks are safely released
