## MODIFIED Requirements

### Requirement: REQ-PROTO-004 World Snapshot Broadcast (WORLD_SNAPSHOT)
The server MUST broadcast world snapshots containing positions, alive states, mass, scores, foods, and leaderboard at engine tick rate (30-40 Hz). Each `WORLD_SNAPSHOT` MUST include a `tickDurationMs` field carrying the real elapsed wall-clock time, in milliseconds, that the loop consumed producing that tick, so that clients can distinguish a genuine server-side stall from ordinary network jitter.

#### Scenario: Snapshot broadcast tick
- **WHEN** the server physics loop completes a simulation tick
- **THEN** a WORLD_SNAPSHOT packet is broadcast to all active connections

#### Scenario: Snapshot reports real tick duration
- **WHEN** a WORLD_SNAPSHOT packet is constructed for a completed tick
- **THEN** the packet's `tickDurationMs` field reflects the actual wall-clock time that tick took to produce, not the nominal fixed timestep

## ADDED Requirements

### Requirement: REQ-PROTO-008 Adaptive Interpolation Buffer Contract
The client's remote-entity interpolation buffer MUST maintain an adaptive render delay that grows in response to measured snapshot-arrival jitter, including stalls of any duration — a stall MUST NOT be excluded from the jitter measurement used to size the buffer. When the render clock advances past the newest buffered snapshot, the client MUST extrapolate remote entity motion from the most recent known velocity up to a bounded maximum extrapolation duration before falling back to holding the last known state.

#### Scenario: A long stall widens the adaptive buffer
- **WHEN** the gap between two consecutive snapshot arrivals exceeds the buffer's normal jitter range, including gaps at or beyond what was previously an exclusion threshold
- **THEN** that gap is included in the buffer's jitter measurement and the adaptive render delay increases in response

#### Scenario: Brief buffer exhaustion is bridged with extrapolation
- **WHEN** the render clock momentarily advances past the newest buffered snapshot for less than the bounded maximum extrapolation duration
- **THEN** the client extrapolates the affected entity's position from its last known velocity instead of freezing immediately

### Requirement: REQ-PROTO-009 Local Prediction Reconciliation Contract
When the client's local player prediction reconciles against an authoritative snapshot and the positional drift exceeds the hard-correction threshold, the client MUST apply an instant correction only when the drift is not attributable to a known, flagged server-side stall; when the drift follows a flagged stall, the client MUST instead apply a fast eased correction so the local snake visibly catches up rather than teleporting.

#### Scenario: Unflagged large drift still hard-snaps
- **WHEN** local prediction reconciles against a snapshot with drift exceeding the hard-correction threshold and no stall was flagged for that gap
- **THEN** the client applies an instant positional correction, as before

#### Scenario: Drift caused by a flagged stall eases back into place
- **WHEN** local prediction reconciles against a snapshot with drift exceeding the hard-correction threshold and the preceding gap was flagged as a known server-side stall
- **THEN** the client applies a fast eased correction over a short bounded duration instead of an instant teleport
