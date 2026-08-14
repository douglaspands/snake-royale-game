## Purpose
Player lifecycle with size 3 spawn.

## MODIFIED Requirements

### Requirement: REQ-LIFE-001 Player Session State Machine
The server SHALL govern player lifecycle through states LOBBY, PLAYING, BOOSTING, DEAD, and RESPAWNING with spawn mass 3.0.

#### Scenario: Lobby to playing transition
- **WHEN** client in LOBBY state submits valid JOIN packet
- **THEN** player transitions to PLAYING and spawns with mass 3.0 and 3 segments

#### Scenario: Death state transition
- **WHEN** player suffers an arena or body collision
- **THEN** player transitions to DEAD and receives PLAYER_DEATH packet
