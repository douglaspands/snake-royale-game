# OpenSpec Tasks: v1.4.0-HUD-LAYOUT Implementation Checklist
**Change ID:** `v1.4.0-hud-layout`  
**Status:** `COMPLETED`  

---

## Phase 1: OpenSpec & Delta Specifications
- [x] Create `openspec/changes/v1.4.0-hud-layout/` (`proposal.md`, `design.md`, `tasks.md`, `specs/hud.delta.md`).
- [x] Create `specs/SPEC-v1.4.0-VIPER-HUD.md` and update `specs/SPEC-INDEX.md`.

---

## Phase 2: Client HUD Implementation
- [x] Update `client/src/ui/hud.ts`:
  - [x] Streamline `#stats-card` to 2 essential metrics (`SCORE` and `RANK`).
  - [x] Remove telemetry references and unused element lookups in `updateHUD()`.
- [x] Update `client/src/index.css`:
  - [x] Optimize `.stats-box` dimensions (`min-width: 130px;`) for mobile and desktop screens.
  - [x] Ensure `.leaderboard-box` (top-right), `.stats-box` (bottom-left) and `.mobile-turbo-btn` clearance.
- [x] Update `client/src/render/renderer.ts`:
  - [x] Verify minimap radar position in bottom-right corner.

---

## Phase 3: Automated Tests & Verification
- [x] Update `client/tests/hud.test.ts` to assert `stat-score` and `stat-rank`.
- [x] Run `cd client && npm test` (100% pass).
- [x] Run `cd client && npm run build` (100% pass).
- [x] Run `uv run pytest` (100% pass).
