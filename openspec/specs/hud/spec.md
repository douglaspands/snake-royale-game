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

### Requirement: REQ-HUD-004 Localized UI Text by OS Language
The client MUST detect the host operating system's or browser's preferred language via `navigator.language` and `navigator.languages` once at startup, and MUST render all user-facing UI text — the nickname modal, HUD labels, the respawn screen, and the page title — in the matching supported locale: Brazilian Portuguese (`pt-BR`), Spanish (`es`), or U.S. English (`en-US`). The client MUST fall back to `en-US` when the detected language matches none of the three supported locales. The client MUST NOT require a page reload, network request, or manual selection to apply the detected locale.

#### Scenario: Browser reports a supported language
- **GIVEN** `navigator.language` reports `pt-BR`
- **WHEN** the application loads
- **THEN** the nickname modal, HUD labels, respawn screen, and page title all render in Brazilian Portuguese

#### Scenario: Browser reports an unsupported language
- **GIVEN** `navigator.language` reports `fr-FR`
- **WHEN** the application loads
- **THEN** all UI text renders in `en-US`, the default fallback

#### Scenario: A regional variant matches its base language
- **GIVEN** `navigator.language` reports `es-MX`
- **WHEN** the application loads
- **THEN** all UI text renders in Spanish, matched by the base language code
