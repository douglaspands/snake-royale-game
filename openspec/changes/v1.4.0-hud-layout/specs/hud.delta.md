# Delta Specification: HUD Layout & Player Stats
**Capability:** `ui/hud-layout`  
**Domain:** Client UI & Minimap  

---

## 1. Requirements

### REQ-HUD-001: Leaderboard Placement (Top-Right)
The Top 10 leaderboard MUST be anchored to the top-right corner (`top: 16px; right: 16px;`) of the viewport with pointer events set to pass-through.

### REQ-HUD-002: Vital Stats Placement & Format (Bottom-Left)
The player vital statistics container MUST be anchored to the bottom-left corner (`bottom: 16px; left: 16px;`) and contain exactly 2 rows:
1. `SCORE: <score>`
2. `RANK: <rank>`

Raw coordinate positioning (`POS`) MUST NOT be displayed in this container.

### REQ-HUD-003: Minimap Placement & Radar Rendering (Bottom-Right)
The arena minimap MUST be rendered in Canvas 2D at the bottom-right corner of the canvas viewport (`screenHeight - mapSize - 16px`).
- Local snake MUST be highlighted in Neon Cyan (`#00f0ff`).
- Enemy snakes MUST be marked in Magenta (`#ff0055`).
- Mobile touch turbo buttons MUST NOT obstruct the minimap area.
