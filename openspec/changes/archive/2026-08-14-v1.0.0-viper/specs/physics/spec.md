## Purpose
Server-authoritative physics simulation and spatial collisions.

## ADDED Requirements

### Requirement: REQ-PHYS-001 Arena Boundaries and Geometry
The physics simulation SHALL maintain a 2D bounding arena of 3000x3000 pixels.

#### Scenario: Boundary containment
- **WHEN** snake exceeds boundaries
- **THEN** snake is eliminated immediately
