## Purpose
Compact snake spawn and mass-draining boost mechanics.

## MODIFIED Requirements

### Requirement: REQ-PHYS-002 Locomotion and Boost Dynamics
The engine SHALL propel snakes at base speed 180 px/s and turbo boost speed 360 px/s when mass exceeds minimum threshold 3.0.

#### Scenario: Boost acceleration and mass drain
- **WHEN** player activates boost with mass > 3.0
- **THEN** speed increases to 360 px/s and mass is drained at 4.0 mass/s dropping boost pellets

#### Scenario: Boost cutoff at minimum mass
- **WHEN** boosting snake mass reaches 3.0
- **THEN** boost is automatically disabled and speed reverts to 180 px/s
