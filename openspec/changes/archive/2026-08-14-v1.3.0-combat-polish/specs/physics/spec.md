## Purpose
Pure-contact collision physics without self-collision.

## MODIFIED Requirements

### Requirement: REQ-PHYS-006 Pure-Contact Collision Resolution
The physics engine SHALL detect collisions using spatial hash partitioning with pure-contact rules: no self-collision, head-to-body elimination, and head-to-head resolution based on mass superiority.

#### Scenario: Head to body elimination
- **WHEN** snake A head contacts any body segment of snake B
- **THEN** snake A is eliminated and converted to corpse food pellets

#### Scenario: No self collision
- **WHEN** a snake curves sharply and touches its own body segments
- **THEN** no collision occurs and the snake remains alive
