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

### Requirement: REQ-REND-005 Viewport-Exact Drawing Surface
The client MUST size its drawing surface from the layout viewport, and the rendered document MUST NOT exceed the layout viewport on either axis. The client MUST NOT derive the drawing surface dimensions from the visual viewport, whose size varies with the host's page scale.

#### Scenario: Drawing surface matches the layout viewport
- **WHEN** the client sizes or resizes the game canvas
- **THEN** the canvas CSS dimensions MUST equal the layout viewport dimensions, and the document MUST produce no horizontal or vertical overflow

#### Scenario: Page scale does not feed back into surface sizing
- **GIVEN** the host applies a page scale other than 1.0
- **WHEN** the client recomputes the drawing surface
- **THEN** the computed dimensions MUST be unchanged from those computed at page scale 1.0
