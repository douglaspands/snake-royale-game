## Purpose
Deterministic 2D physics engine, inverse kinematics snake locomotion, mass-draining boost mechanics, agile turning dynamics, and pure-contact collision resolution.

## Requirements

### Requirement: REQ-PHYS-001 Arena Boundaries and Geometry
The physics simulation SHALL maintain a 2D bounding arena of 3000x3000 pixels where crossing boundary edges causes immediate snake death.

#### Scenario: Arena boundary death
- **WHEN** a snake head coordinates exceed arena bounds [0, 3000]
- **THEN** the snake status transitions to dead and corpse pellets spawn

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

### Requirement: REQ-PHYS-003 Dynamic Agile Turn Rate
The engine SHALL calculate maximum turning rate dynamically as a decreasing function of snake mass, ranging from 9.8 rad/s at spawn down to 5.2 rad/s for large snakes.

#### Scenario: Agile turning on small snake
- **WHEN** a snake with spawn mass 3.0 turns toward target angle
- **THEN** turn rate angular velocity reaches up to 9.8 rad/s

### Requirement: REQ-PHYS-004 Inverse Kinematics Body Segments
The snake body SHALL follow the head using inverse kinematics with fixed 8px segment spacing and base length of 3 segments.

#### Scenario: Segment trail follow
- **WHEN** the snake head advances forward
- **THEN** body segments smoothly follow the recorded trajectory points preserving 8px distance

### Requirement: REQ-PHYS-005 Food Absorption and Mass Growth
Snakes SHALL absorb food pellets when head distance is within absorption radius, increasing mass and body segment length.

#### Scenario: Food consumption
- **WHEN** snake head comes within absorption distance of a food pellet
- **THEN** food is removed and snake mass increases accordingly

### Requirement: REQ-PHYS-006 Pure-Contact Collision Resolution
The physics engine SHALL detect collisions using spatial hash partitioning with pure-contact rules: no self-collision, head-to-body elimination, and head-to-head resolution based on mass superiority.

#### Scenario: Head to body elimination
- **WHEN** snake A head contacts any body segment of snake B
- **THEN** snake A is eliminated and converted to corpse food pellets

#### Scenario: No self collision
- **WHEN** a snake curves sharply and touches its own body segments
- **THEN** no collision occurs and the snake remains alive
