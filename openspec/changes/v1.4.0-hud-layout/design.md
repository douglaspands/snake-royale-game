# OpenSpec Design: v1.4.0-HUD-LAYOUT — HUD Architecture & Specifications
**Change ID:** `v1.4.0-hud-layout`  
**Status:** `IN_PROGRESS`  

---

## 1. HUD Architecture & Spatial Matrix

```
┌────────────────────────────────────────────────────────┐
│ [Clean Gameplay View]         [🏆 TOP VIPERS / RANKING]│ (Top-Right: 16px, 16px)
│                                                        │
│                                                        │
│                     ARENA                              │
│                                                        │
│                                                        │
│ [📊 PLAYER VITAL STATS]        [🗺️ RADAR / MINIMAPA]   │ (Bottom-Right: 16px, 16px)
│  - SCORE: <score>               - Local Player (Cyan)  │
│  - RANK: #<rank>                - Enemies (Magenta)    │
│                                 - Grid / Bounds        │
│ (Bottom-Left: 16px, 16px)                              │
└────────────────────────────────────────────────────────┘
```

---

## 2. Component Specifications

### 2.1 Player Stats Card (`#stats-card`)
- **DOM Container:** `#stats-card.hud-card.stats-box`
- **Rows:**
  - Row 1: `<span>SCORE:</span> <b id="stat-score">0</b>`
  - Row 2: `<span>RANK:</span> <b id="stat-rank">#--</b>`
- **Dynamic Update:**
  - `scoreEl.textContent = localSnake.score.toLocaleString()`
  - `rankEl.textContent = myRank ? `#${myRank.rank}` : '#--'`

### 2.2 Leaderboard Card (`#leaderboard-card`)
- **DOM Container:** `#leaderboard-card.hud-card.leaderboard-box`
- **Position:** `top: 16px; right: 16px; width: 220px;`
- **Highlight:** Local player highlighted in neon cyan.

### 2.3 Minimap Radar (`_drawMinimap`)
- **Canvas Coordinates:**
  - `mapX = screenWidth - mapSize - 16`
  - `mapY = screenHeight - mapSize - 16`
- **Scale:** `scaleX = mapSize / arenaWidth`, `scaleY = mapSize / arenaHeight`
- **Visuals:** Dark glassmorphism card, crosshair centerlines, cyan player circle ($R=3.2$, glow ring $R=5.0$), magenta opponent dots ($R=2.2$).
