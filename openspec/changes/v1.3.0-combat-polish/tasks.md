# OpenSpec Tasks: v1.3.0-COMBAT-POLISH Implementation Checklist
**Change ID:** `v1.3.0-combat-polish`  
**Status:** `COMPLETED`  

---

## Phase 0: Node 0 — OpenSpec SDD & Delta Specifications
- [x] Create `openspec/changes/v1.3.0-combat-polish/` (`proposal.md`, `design.md`, `tasks.md`).
- [x] Create delta specs:
  - [x] `openspec/changes/v1.3.0-combat-polish/specs/controls.delta.md`
  - [x] `openspec/changes/v1.3.0-combat-polish/specs/physics.delta.md`
  - [x] `openspec/changes/v1.3.0-combat-polish/specs/rendering.delta.md`
  - [x] `openspec/changes/v1.3.0-combat-polish/specs/token_efficiency.delta.md`

---

## Phase 1: Node B1 — Backend Pure-Contact Physics & Collision Safety
- [x] **Node B1 (Backend Collision & Arena Boundaries):**
  - [x] Remove self-collision in `server/app/game/engine.py` (a snake cannot die from its own segments).
  - [x] Fine-tune hitbox collision threshold strictly to $d < R_{\text{head}} + R_{\text{body}} - 2.0\text{px}$.
  - [x] Calibrate head-to-head collision resolution.
  - [x] Unit tests in `server/tests/test_engine.py` and `server/tests/test_snake.py`.

---

## Phase 2: Nodes F1, F2 & F3 — Controls, Anti-Jitter Interpolator & 12+ Skins
- [x] **Node F1 (Universal Double-Tap & Hold Turbo Gesture):**
  - [x] Implement double-tap & hold detector in `client/src/input/virtual_joystick.ts` and `client/src/input/desktop_controller.ts`.
  - [x] Clean up redundant fixed button in `client/src/ui/hud.ts` and `client/src/index.css`.
  - [x] Unit tests in `client/tests/input.test.ts`.
- [x] **Node F2 (Anti-Jitter Clock-Synchronized Interpolator):**
  - [x] Update `client/src/net/interpolator.ts` to tag snapshots with `clientArrivalMs` and interpolate across local time.
  - [x] Unit tests in `client/tests/interpolator.test.ts`.
- [x] **Node F3 (12+ Mixed/Bicolor Skins & Visual Impact Effects):**
  - [x] Add 12+ skins with alternating/gradient/rainbow segment patterns in `client/src/render/renderer.ts`.
  - [x] Update lobby skin picker grid in `client/src/ui/hud.ts` and `client/src/index.css`.
  - [x] Add elimination explosion/particle burst at exact collision coordinates.
  - [x] Unit tests in `client/tests/render.test.ts` and `client/tests/hud.test.ts`.

---

## Phase 3: Node INT — Full-Stack Integration & 10-Player Deterministic Simulation
- [x] **Node INT (E2E Verification):**
  - [x] Multi-snake arena simulation with 10+ concurrent snakes testing skin diversity and zero phantom deaths.
  - [x] Validate double-tap gestures across simulated mobile touch streams.

---

## Phase 4: Node GATE — Multi-Tool Verification & Quality Gate
- [x] `uv run ruff check server` (pass 100%).
- [x] `uv run ruff format --check server` (pass 100%).
- [x] `uv run ty check server` (pass 100%).
- [x] `uv run pytest --cov=server/app` (pass 100%, coverage 93.01% $\ge 80\%$).
- [x] `cd client && npm test` (pass 100%, coverage 88.79% $\ge 80\%$).
- [x] `cd client && npm run build` (pass 100%).

---

## Phase 5: Node DOC — Documentation & Specs Promotion
- [x] Update `README.md` and active specifications.
