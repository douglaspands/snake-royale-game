## MODIFIED Requirements

### Requirement: REQ-PHYS-002 Locomotion and Boost Dynamics
The engine SHALL propel snakes at base speed 180 px/s and turbo boost speed 360 px/s when mass exceeds minimum threshold 3.0. The player's score MUST be derived directly from current mass at all times (`score = floor(mass * 10)`), so that any mass reduction — including boost's mass drain — is reflected as an equivalent, immediate score reduction. Score MUST NOT be retained as a historical maximum once mass has decreased; the snake's visible size MUST always match the score driving the leaderboard.

#### Scenario: Boost acceleration and mass drain
- **WHEN** player activates boost with mass > 3.0
- **THEN** speed increases to 360 px/s and mass is drained at 4.0 mass/s dropping boost pellets

#### Scenario: Boost cutoff at minimum mass
- **WHEN** boosting snake mass reaches 3.0
- **THEN** boost is automatically disabled and speed reverts to 180 px/s

#### Scenario: Boost drain reduces score in lockstep with mass
- **GIVEN** a boosting snake sheds mass from 10.0 to 8.0
- **WHEN** the engine recomputes score after the drain
- **THEN** score decreases from 100 to 80, exactly `floor(mass * 10)` for the new mass, with no historical maximum preserved
