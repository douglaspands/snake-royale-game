## Purpose
Client-side Canvas 2D rendering pipeline, screen-space sub-pixel text stabilization, camera interpolation, skin styling, and elimination particle effects.

## Requirements

### Requirement: REQ-REND-001 Screen-Space Integer-Aligned Nameplates
The client renderer MUST project entity nameplates from world coordinates into screen coordinates and round them to integer device pixels before text rasterization.

#### Scenario: Integer pixel aligned nameplate rasterization
- **WHEN** snake nameplate is rendered
- **THEN** coordinates are integer-rounded in screen-space context to eliminate font hinting jitter

### Requirement: REQ-REND-002 Camera Local Player Target Synchronization
The camera center MUST lock synchronously to the interpolated head position of the local player snake without exponential lag.

#### Scenario: Zero camera lag on local snake
- **WHEN** local player moves across frames
- **THEN** camera center matches local snake head position keeping it centered on viewport

### Requirement: REQ-REND-003 Multi-Skin Palette Support
The renderer SHALL support at least 12 distinct snake skin themes including gradient, bicolor, and rainbow styles.

#### Scenario: Skin pattern rendering
- **WHEN** rendering body segments of a player snake
- **THEN** the corresponding skin color theme and patterns are applied to all segments

### Requirement: REQ-REND-004 Collision Elimination Particle Bursts
The renderer SHALL spawn dynamic visual particle bursts at the exact point of elimination when a snake dies.

#### Scenario: Death particle explosion
- **WHEN** a snake death event occurs
- **THEN** particle effects expand and dissipate over the collision coordinates
