# OpenSpec Tasks: v1.2.0-MICRO-SNAKE Implementation Checklist
**Change ID:** `v1.2.0-micro-snake`  
**Status:** `COMPLETED`  

---

## Phase 0: Node 0 — OpenSpec SDD & Delta Specifications
- [x] Create `openspec/changes/v1.2.0-micro-snake/` (`proposal.md`, `design.md`, `tasks.md`).
- [x] Create delta specs:
  - [x] `openspec/changes/v1.2.0-micro-snake/specs/physics.delta.md`
  - [x] `openspec/changes/v1.2.0-micro-snake/specs/lifecycle.delta.md`
  - [x] `openspec/changes/v1.2.0-micro-snake/specs/harness.delta.md`

---

## Phase 1: Nodes B1 & F1 — Backend Physics & Frontend LocalPredictor
- [x] **Node B1 (Backend Physics & Mass Drain):**
  - [x] Update `Snake` class in `server/app/game/snake.py`:
    - `BASE_SEGMENT_COUNT = 3`
    - `MIN_BOOST_MASS = 3.0`
    - `initial_mass = 3.0`
    - `target_segment_count = BASE_SEGMENT_COUNT + int(max(0.0, self.mass - self.MIN_BOOST_MASS) * 1.5)`
    - Clamp boost condition to `self.mass > self.MIN_BOOST_MASS`.
    - In `step()`: drain mass down to `3.0` and auto-disable boost when reaching `3.0`.
  - [x] Update `GameEngine.register_player` in `server/app/game/engine.py` with `initial_mass = 3.0`.
  - [x] Update unit tests in `server/tests/test_snake.py` and `server/tests/test_engine.py`.
- [x] **Node F1 (Frontend LocalPredictor CSP Sync):**
  - [x] Update `LocalPredictor` in `client/src/net/local_predictor.ts`:
    - `BASE_SEGMENT_COUNT = 3`
    - `MIN_BOOST_MASS = 3.0`
    - `mass = 3.0`
    - Update `_updateBody()` and `setInput()` to match server boost gating and minimum size.
  - [x] Update unit tests in `client/tests/local_predictor.test.ts`.

---

## Phase 2: Node F2 — UI/HUD & Turbo Button Disabled State
- [x] **Node F2 (HUD & Turbo Availability Feedback):**
  - [x] Update `HUDManager.updateHUD()` in `client/src/ui/hud.ts` to toggle `.disabled` class on `mobile-turbo-btn` based on `localSnake.mass > 3.0`.
  - [x] Update `client/src/index.css` with `.mobile-turbo-btn.disabled` styling and visual cue.
  - [x] Update controls hint in lobby.
  - [x] Unit tests in `client/tests/hud.test.ts`.

---

## Phase 3: Node INT — Full-Stack Integration & Deterministic Harness
- [x] **Node INT (E2E Integration):**
  - [x] Run full test harness verifying determinism under zero-sleep virtual clock.
  - [x] Validate mass drain, pellet spawn, and turbo cutoff under multiplayer load.

---

## Phase 4: Node GATE — Quality Gates Verification
- [x] `uv run ruff check server` (pass 100%).
- [x] `uv run ruff format --check server` (pass 100%).
- [x] `uv run ty check server` (pass 100%).
- [x] `uv run pytest --cov=server/app` (pass 100%, coverage $\ge 80\%$).
- [x] `cd client && npm test` (pass 100%, coverage $\ge 80\%$).
- [x] `cd client && npm run build` (pass 100%).

---

## Phase 5: Node DOC — Documentation & Specs Promotion
- [x] Update `specs/SPEC-v1.0.0-VIPER-PHYSICS.md` and `specs/SPEC-v1.0.0-VIPER-LIFECYCLE.md`.
- [x] Update `README.md`.
