# SPECIFICATION: v1.4.0-VIPER-HUD
**Domain:** Client HUD Architecture, Layout Ergonomics & Player Telemetry  
**Compliance:** [OpenSpec HUD Delta](file:///home/douglas/Workspace/claude/snake-game/openspec/changes/v1.4.0-hud-layout/specs/hud.delta.md)  

---

## 1. Spatial HUD Triad Invariants
1. **Top-Right Leaderboard (`#leaderboard-card`):** Positioned at `top: 16px; right: 16px;`. Displays Top 10 rankers with active local player highlight.
2. **Bottom-Left Vital Stats (`#stats-card`):** Positioned at `bottom: 16px; left: 16px;`. Displays:
   - `SCORE: <score>`
   - `RANK: #<rank>`
3. **Bottom-Right Minimap Radar:** Rendered on Canvas 2D at `x = width - size - 16`, `y = height - size - 16`. Features high-contrast Cyan/Magenta player blips and internal crosshairs.
