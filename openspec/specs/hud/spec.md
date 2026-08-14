## Purpose
Ergonomic HUD interface, 3-corner screen layout distribution, vital statistics display, and minimap radar.

## Requirements

### Requirement: REQ-HUD-001 Three-Corner Ergonomic HUD Layout
The client UI SHALL position game HUD components across three screen corners: Leaderboard at Top-Right, Vital Stats at Bottom-Left, and Radar Minimap at Bottom-Right.

#### Scenario: Responsive corner distribution
- **WHEN** the game interface is displayed on desktop or mobile
- **THEN** HUD components render in their designated corners without overlapping the center play area

### Requirement: REQ-HUD-002 Vital Statistics Metrics
The vital stats panel at bottom-left SHALL display real-time player Score and current Match Rank.

#### Scenario: Score and rank update
- **WHEN** world snapshot updates player state
- **THEN** stats card displays updated score and rank values

### Requirement: REQ-HUD-003 Bottom-Right Radar Minimap
The radar minimap SHALL render in the bottom-right corner of the canvas displaying arena boundaries, food clusters, and player positions.

#### Scenario: Minimap position rendering
- **WHEN** canvas frames are rendered
- **THEN** radar minimap is drawn in bottom-right corner with local player and opponent indicators
