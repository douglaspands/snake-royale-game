## Purpose
Visual skins and elimination effects.

## ADDED Requirements

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
