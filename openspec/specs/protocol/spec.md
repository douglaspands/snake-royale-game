## Purpose
Real-time WebSocket protocol and binary/JSON packet contracts between Snake Royale client and server-authoritative backend.

## Requirements

### Requirement: REQ-PROTO-001 Client Connection Handshake (JOIN)
The client MUST send a `JOIN` packet immediately upon establishing the WebSocket connection containing nickname and skin selection.

#### Scenario: Valid client handshake
- **WHEN** client sends a valid JOIN payload with nickname and skin
- **THEN** server accepts the connection and returns a JOIN_ACK packet

### Requirement: REQ-PROTO-002 Server Acknowledgment (JOIN_ACK)
Upon validating the `JOIN` packet, the server MUST reply with a `JOIN_ACK` containing the player's unique assigned `playerId`, arena dimensions, and tick rate.

#### Scenario: Server handshake response
- **WHEN** the server registers the player
- **THEN** JOIN_ACK is dispatched with playerId and arena boundaries

### Requirement: REQ-PROTO-003 Player Input Stream (INPUT)
The client SHALL stream input packets to the server containing target heading angle in radians, boost flag, and input sequence number.

#### Scenario: Input stream dispatch
- **WHEN** player directs angle or toggles boost
- **THEN** INPUT packet with monotonic sequence number is sent to the server

### Requirement: REQ-PROTO-004 World Snapshot Broadcast (WORLD_SNAPSHOT)
The server MUST broadcast world snapshots containing positions, alive states, mass, scores, foods, and leaderboard at engine tick rate (30-40 Hz). Each `WORLD_SNAPSHOT` MUST include a `tickDurationMs` field carrying the real elapsed wall-clock time, in milliseconds, that the loop consumed producing that tick, so that clients can distinguish a genuine server-side stall from ordinary network jitter.

#### Scenario: Snapshot broadcast tick
- **WHEN** the server physics loop completes a simulation tick
- **THEN** a WORLD_SNAPSHOT packet is broadcast to all active connections

#### Scenario: Snapshot reports real tick duration
- **WHEN** a WORLD_SNAPSHOT packet is constructed for a completed tick
- **THEN** the packet's `tickDurationMs` field reflects the actual wall-clock time that tick took to produce, not the nominal fixed timestep

### Requirement: REQ-PROTO-005 Death Notification (PLAYER_DEATH)
When a snake dies due to boundary collision or hitting another snake's body, the server MUST emit a `PLAYER_DEATH` packet with killer information and final stats.

#### Scenario: Player death emission
- **WHEN** a snake entity dies in the engine
- **THEN** PLAYER_DEATH packet is sent to the eliminated player

### Requirement: REQ-PROTO-006 Respawn Request (RESPAWN_REQUEST)
A dead player MAY request to respawn in the same room by sending a `RESPAWN_REQUEST` packet.

#### Scenario: Respawn request flow
- **WHEN** dead player triggers respawn action
- **THEN** RESPAWN_REQUEST is processed and player is re-spawned at safe coordinates

### Requirement: REQ-PROTO-007 Single Active Input Source for the INPUT Stream
The client MUST derive the heading angle sent in each `INPUT` packet from exactly one control scheme at a time: mouse/keyboard aim, or the touch virtual joystick. Mouse/keyboard aim tracking MUST ignore pointer events whose type is not `mouse`, so that a touch-synthesized pointer event cannot alter the aimed heading. When the touch virtual joystick is released, the client MUST continue transmitting the joystick's own last commanded heading angle rather than substituting the heading angle of a different, inactive control scheme.

#### Scenario: Touch input cannot contaminate mouse aim
- **WHEN** a touch or pen pointer event is dispatched on the client
- **THEN** the stored mouse/keyboard aim angle MUST NOT change as a result

#### Scenario: Releasing the virtual joystick holds the last commanded heading
- **GIVEN** the player has been steering with the touch virtual joystick
- **WHEN** the player releases the joystick
- **THEN** subsequent INPUT packets MUST carry the joystick's last commanded heading angle, not the mouse/keyboard aim angle

#### Scenario: Switching to mouse aim after touch use
- **GIVEN** the touch virtual joystick was the most recently active control scheme
- **WHEN** the player provides a genuine mouse-move or keyboard event
- **THEN** subsequent INPUT packets MUST carry the newly active mouse/keyboard aim angle

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
