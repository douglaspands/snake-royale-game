## Purpose
Dynamic agile turning dynamics.

## MODIFIED Requirements

### Requirement: REQ-PHYS-003 Dynamic Agile Turn Rate
The engine SHALL calculate maximum turning rate dynamically as a decreasing function of snake mass, ranging from 9.8 rad/s at spawn down to 5.2 rad/s for large snakes.

#### Scenario: Agile turning on small snake
- **WHEN** a snake with spawn mass 3.0 turns toward target angle
- **THEN** turn rate angular velocity reaches up to 9.8 rad/s
