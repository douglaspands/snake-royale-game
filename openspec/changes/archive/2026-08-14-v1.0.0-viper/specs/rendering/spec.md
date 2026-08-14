## Purpose
Canvas 2D rendering pipeline and camera tracking.

## ADDED Requirements

### Requirement: REQ-REND-001 Screen-Space Integer-Aligned Nameplates
The client renderer MUST project entity nameplates into screen coordinates and round them to integer pixels.

#### Scenario: Sub-pixel jitter elimination
- **WHEN** nameplates are rendered
- **THEN** coordinates are integer-rounded in screen space
