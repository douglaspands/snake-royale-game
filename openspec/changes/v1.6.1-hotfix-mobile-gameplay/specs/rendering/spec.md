## ADDED Requirements

### Requirement: REQ-REND-005 Viewport-Exact Drawing Surface
The client MUST size its drawing surface from the layout viewport, and the rendered document MUST NOT exceed the layout viewport on either axis. The client MUST NOT derive the drawing surface dimensions from the visual viewport, whose size varies with the host's page scale.

#### Scenario: Drawing surface matches the layout viewport
- **WHEN** the client sizes or resizes the game canvas
- **THEN** the canvas CSS dimensions MUST equal the layout viewport dimensions, and the document MUST produce no horizontal or vertical overflow

#### Scenario: Page scale does not feed back into surface sizing
- **GIVEN** the host applies a page scale other than 1.0
- **WHEN** the client recomputes the drawing surface
- **THEN** the computed dimensions MUST be unchanged from those computed at page scale 1.0
