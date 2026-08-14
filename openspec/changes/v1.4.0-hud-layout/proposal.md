# OpenSpec Proposal: v1.4.0-HUD-LAYOUT — HUD Ergonomic Reorganization & Compact Player Stats
**Change ID:** `v1.4.0-hud-layout`  
**Author:** AI Pair Programmer & Systems Architect  
**Status:** `IN_PROGRESS`  

---

## 1. Intent & Problem Statement
To optimize playability, tactical awareness, and visual clarity across desktop and mobile screens, the in-game HUD layout requires ergonomic redistribution into distinct screen corners:
1. **Top-Right Corner:** Top 10 Leaderboard / Ranking (`🏆 TOP VIPERS`) for effortless competitive visibility without obstructing the arena center.
2. **Bottom-Left Corner:** Local Player Vital Stats (`#stats-card`), featuring `SCORE`, a compact unified `LENGTH/MASS: <tamanho> / <massa>` row, and `RANK`, removing redundant raw world coordinate telemetry (`POS`).
3. **Bottom-Right Corner:** Real-time Radar / Minimap (`_drawMinimap`), rendering nearby player dots and arena bounds in the bottom-right corner with local player neon cyan highlighting.

---

## 2. Scope & Target Capabilities
- **Ergonomic 3-Corner HUD Layout:** Clean separation of Leaderboard (Top-Right), Player Stats (Bottom-Left), and Radar/Minimap (Bottom-Right).
- **Unified Compact Stat Format:** Single-row `LENGTH/MASS: <tamanho> / <massa>` display with high-contrast JetBrains Mono typography.
- **Minimap Repositioning & Radar Styling:** Canvas 2D minimap rendered at `(screenWidth - mapSize - 16, screenHeight - mapSize - 16)` with subtle radar crosshairs and cyan/magenta player blips.
- **Mobile Turbo Button Clearance:** Repositioning mobile boost button to avoid overlap with bottom-right minimap on small touchscreens.
- **100% Test Coverage:** Vitest unit tests verifying HUD DOM generation, dynamic updates, and schema integrity.
