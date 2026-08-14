# OpenSpec Tasks: v1.1.0-REFLEX Implementation Checklist
**Change ID:** `v1.1.0-reflex`  
**Status:** `COMPLETED`  

---

## Phase 0: Node 0 — OpenSpec SDD & Base Setup
- [x] Create `openspec/changes/v1.1.0-reflex/` (`proposal.md`, `design.md`, `tasks.md`).
- [x] Create delta specs: `specs/physics.delta.md`, `specs/protocol.delta.md`, `specs/prediction.delta.md`, `specs/harness.delta.md`.

---

## Phase 1: Nodes B1 & F1 — Agile Turn Dynamics & Instant Input Dispatch
- [x] **Node B1 (Backend Agile Physics & Sequence Tracking):**
  - [x] Implement dynamic $\omega(M)$ turn rate in `server/app/game/snake.py`.
  - [x] Support `last_input_seq` in `server/app/game/engine.py` and `server/app/websocket_handler.py`.
  - [x] Unit tests for dynamic turning in `server/tests/test_snake.py`.
- [x] **Node F1 (Frontend Instant Reflex Input Engine):**
  - [x] Implement event-driven instant dispatch in `client/src/input/desktop_controller.ts`.
  - [x] Implement circular deadzone and instant dispatch in `client/src/input/virtual_joystick.ts`.
  - [x] Unit tests in `client/tests/input.test.ts`.

---

## Phase 2: Nodes F2 & F3 — CSP & Adaptive Interpolator
- [x] **Node F2 (Frontend Local Client-Side Prediction):**
  - [x] Implement `client/src/net/local_predictor.ts` with sub-tick kinematics and anti-snap error decay.
  - [x] Unit tests in `client/tests/local_predictor.test.ts`.
- [x] **Node F3 (Frontend Adaptive Jitter Buffer):**
  - [x] Implement dynamic adaptive buffer in `client/src/net/interpolator.ts` ($35-45\text{ms}$).
  - [x] Unit tests in `client/tests/interpolator.test.ts`.

---

## Phase 3: Node INT — Integration & Canvas 2D Linkage
- [x] Integrate `LocalPredictor` into `client/src/main.ts` and `client/src/render/renderer.ts`.
- [x] Ensure local snake rendering uses predicted state with zero input lag.
- [x] Benchmark zero-sleep deterministic test harness on both ends.

---

## Phase 4: Node GATE — Multi-Tool Verification & Quality Gate
- [x] `uv run ruff check server` (pass 100%).
- [x] `uv run ruff format --check server` (pass 100%).
- [x] `uv run ty check server` (pass 100%).
- [x] `uv run pytest` (pass 100%, coverage $\ge 80\%$).
- [x] `cd client && npm test` (pass 100%, coverage $\ge 80\%$).
- [x] `cd client && npm run build` (tsc and vite build pass).

---

## Phase 5: Node DOC — Documentation & Final Specs Promotion
- [x] Create `docs/LATENCY_AND_COMMAND_TUNING.md`.
- [x] Update `README.md` and active specifications.
