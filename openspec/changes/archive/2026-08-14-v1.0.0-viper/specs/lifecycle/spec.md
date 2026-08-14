## Purpose
Player and room lifecycle management for Snake Battle Royale.

## ADDED Requirements

### Requirement: REQ-LIFE-001 Player Session State Machine
The server SHALL govern player lifecycle through states LOBBY, PLAYING, BOOSTING, DEAD, and RESPAWNING.

#### Scenario: Player session progression
- **WHEN** player connects and joins
- **THEN** state machine advances from LOBBY to PLAYING
