## Purpose
Player and Arena Finite State Machines, session management, safe spawn calculations, and leaderboard aggregation.

## Requirements

### Requirement: REQ-LIFE-001 Player Session State Machine
The server SHALL govern player lifecycle through states LOBBY, PLAYING, BOOSTING, DEAD, and RESPAWNING.

#### Scenario: Lobby to playing transition
- **WHEN** client in LOBBY state submits valid JOIN packet
- **THEN** player transitions to PLAYING and spawns with mass 3.0 and 3 segments

#### Scenario: Death state transition
- **WHEN** player suffers an arena or body collision
- **THEN** player transitions to DEAD and receives PLAYER_DEATH packet

### Requirement: REQ-LIFE-002 Safe Spawn Point Calculation
The lifecycle manager SHALL compute spawn and respawn coordinates ensuring a minimum clearance of 150 pixels from all existing snake entities.

#### Scenario: Safe spawn location
- **WHEN** a new or respawning player requests arena entry
- **THEN** spawn location is placed in free space with at least 150px clearance from all snakes

### Requirement: REQ-LIFE-003 Arena Ambient Food Management
The room manager SHALL maintain ambient food density at target count of 600 pellets, replenishing when count drops below 500.

#### Scenario: Ambient food replenishment
- **WHEN** active food count drops below 500 pellets
- **THEN** new food pellets spawn across unoccupied sectors until count reaches 600

### Requirement: REQ-LIFE-004 Leaderboard Aggregation
The server SHALL compute and rank all active players by score on every simulation tick.

#### Scenario: Real-time leaderboard ranking
- **WHEN** world snapshot is assembled
- **THEN** leaderboard entries are sorted in descending order of player score
