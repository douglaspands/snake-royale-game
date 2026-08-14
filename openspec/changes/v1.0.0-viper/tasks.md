# OpenSpec Tasks: v1.0.0-VIPER Implementation Checklist
**Change ID:** `v1.0.0-viper`  
**Status:** `COMPLETED`  

---

## Phase 0: Node 0 — OpenSpec SDD & Base Setup
- [x] Create `.gitignore` and `.github/workflows/ci.yml`.
- [x] Create `openspec/config.yaml`.
- [x] Create domain specs: `protocol/spec.md`, `physics/spec.md`, `lifecycle/spec.md`, `harness/spec.md`.
- [x] Create change package `openspec/changes/v1.0.0-viper/` (`proposal.md`, `design.md`, `tasks.md`, `specs/*.delta.md`).
- [x] Create canonical bridges in `specs/` (`SPEC-INDEX.md`, `SPEC-v1.0.0-VIPER-*.md`).

---

## Phase 1: Nodes B1 & F1 — Stack Setup & Test Harnesses
- [x] **Node B1 (Backend Setup & Harness):**
  - [x] Initialize Python environment with `uv` and `pyproject.toml` (FastAPI, Uvicorn, WebSockets, Pytest, Pydantic, jsonschema).
  - [x] Implement `server/tests/harness/virtual_clock.py` (discrete tick control without real-time sleep).
  - [x] Implement `server/tests/harness/schema_validator.py` (JSON Schema protocol verification).
  - [x] Implement `server/tests/harness/factories.py` (entity generators for snakes, foods, and collisions).
  - [x] Implement `server/tests/harness/mock_client.py` (in-memory WebSocket client simulator).
  - [x] Setup `server/tests/conftest.py`.
- [x] **Node F1 (Frontend Setup & Harness):**
  - [x] Initialize Vite + TypeScript in `client/` (`package.json`, `vite.config.ts`, `tsconfig.json`).
  - [x] Configure `vitest` in `client/vitest.config.ts`.
  - [x] Implement `client/tests/harness/canvas_mock.ts` (`CanvasRenderingContext2D` and `requestAnimationFrame` mocks).
  - [x] Implement `client/tests/harness/touch_simulator.ts` (synthetic pointer/touch event dispatcher).
  - [x] Implement `client/tests/harness/packet_generator.ts` (snapshot sequence generator with jitter).

---

## Phase 2: Nodes B2 & F2 — TDD Domain Logic & Controls
- [x] **Node B2 (Backend TDD Physics & Engine):**
  - [x] Unit test & implement 2D Vector math (`server/app/game/math2d.py`).
  - [x] Unit test & implement Snake entity, angle turning, and IK segments (`server/app/game/snake.py`).
  - [x] Unit test & implement Food manager, ambient spawning, and boost pellets (`server/app/game/food.py`).
  - [x] Unit test & implement Spatial Hash partitioning & collisions (`server/app/game/spatial_hash.py`).
  - [x] Unit test & implement Player & Room FSM (`server/app/game/lifecycle.py`).
  - [x] Unit test & implement deterministic Game Engine (`server/app/game/engine.py`).
- [x] **Node F2 (Frontend TDD Controls & Net):**
  - [x] Unit test & implement Desktop Input Controller (`client/src/input/desktop_controller.ts`).
  - [x] Unit test & implement Dynamic Floating Virtual Joystick (`client/src/input/virtual_joystick.ts`).
  - [x] Unit test & implement Camera System with Retina DPI scaling (`client/src/render/camera.ts`).
  - [x] Unit test & implement LERP Snapshot Interpolator (`client/src/net/interpolator.ts`).

---

## Phase 3: Nodes B3 & F3 — Networking, Game Loop & Canvas 2D
- [x] **Node B3 (Backend Loop & WebSockets):**
  - [x] Implement WebSocket connection manager & packet handlers (`server/app/websocket_handler.py`).
  - [x] Implement async Game Loop runner (`server/app/game/loop.py`).
  - [x] Implement FastAPI entrypoint (`server/app/main.py`).
- [x] **Node F3 (Frontend Canvas Renderer & HUD UI):**
  - [x] Implement high-FPS Canvas 2D Renderer (`client/src/render/renderer.ts`).
  - [x] Implement HUD UI components (Leaderboard, Score, Lobby & Death Screen) (`client/src/ui/hud.ts`).
  - [x] Implement WebSocket client manager (`client/src/net/ws_client.ts`).
  - [x] Wire up main frontend game loop (`client/src/main.ts`).

---

## Phase 4: Node INT — Integration & Single-Command Distribution
- [x] Build production frontend assets (`cd client && npm run build` -> `client/dist`).
- [x] Configure FastAPI `StaticFiles` to serve `client/dist` on `/`.
- [x] Validate single-command execution: `uv run uvicorn server.app.main:app --host 0.0.0.0 --port 8000`.

---

## Phase 5: Node DOC — Documentation, Assets & Final Validation
- [x] Generate visual game asset in `assets/game_preview.png`.
- [x] Write comprehensive didactic `README.md`.
- [x] Write `docs/SPEC_DRIVEN_DEVELOPMENT.md` and `docs/TEST_HARNESS.md`.
- [x] Run full test suites and ensure 100% pass: `uv run pytest` and `npm test`.
