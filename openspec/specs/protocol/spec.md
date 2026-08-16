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
The server MUST broadcast world snapshots containing positions, alive states, mass, scores, foods, and leaderboard at engine tick rate (30-40 Hz).

#### Scenario: Snapshot broadcast tick
- **WHEN** the server physics loop completes a simulation tick
- **THEN** a WORLD_SNAPSHOT packet is broadcast to all active connections

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
