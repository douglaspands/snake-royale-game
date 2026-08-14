# OpenSpec: Test Harness & Quality Invariants Specification
**Domain:** `harness`  
**Version:** `1.0.0-VIPER`  
**Status:** `ACTIVE`  

---

## 1. Test Harness Architecture & Objectives

The Test Harness provides deterministic, non-blocking simulation environments for both Python (Backend) and TypeScript (Frontend).

### Key Invariants
1. **Zero Real-Time Sleep:** No test case may invoke `time.sleep()`, `asyncio.sleep()` with non-zero simulated wall-clock, or `setTimeout()`.
2. **Virtual Clock Discretization:** Time moves forward solely via `clock.advance(dt)` or `engine.step(dt)`.
3. **Execution Budget:** Entire test suite (Backend + Frontend) MUST complete in $< 2.0\text{ seconds}$.
4. **Schema Conformance:** Every generated mock packet must be automatically validated against the JSON schemas in `protocol/spec.md`.
5. **Code Coverage Gate (REQ-HARN-006):** Automated test suites MUST maintain a minimum of 80% line and statement coverage across both backend and frontend production source code. CI pipelines MUST fail if coverage falls below 80%.
6. **Backend Static Quality Gate (REQ-HARN-007):** The entire Python codebase (`server/app/` and `server/tests/`) MUST maintain 100% compliance with `ruff check`, `ruff format --check`, and `ty check` with zero errors, zero warnings, and zero type diagnostics.

---

## 2. Backend Test Harness Components (`server/tests/harness/`)

| Component | File | Responsibility |
| :--- | :--- | :--- |
| **Virtual Clock** | `virtual_clock.py` | Provides deterministic time advancement, stepping the physics simulation frame-by-frame with exact $\Delta t = 0.033\text{s}$. |
| **Schema Validator** | `schema_validator.py` | Strict validation of WebSocket packets against draft-07 JSON Schemas. |
| **Mock Client** | `mock_client.py` | In-memory client connection simulator capable of buffering incoming broadcast packets and asserting state deltas. |
| **Entity Factories** | `factories.py` | Fixture generators for pre-configured snakes (head, segments, mass, skin) and food grids. |

---

## 3. Frontend Test Harness Components (`client/tests/harness/`)

| Component | File | Responsibility |
| :--- | :--- | :--- |
| **Canvas Mock** | `canvas_mock.ts` | Complete mock of `HTMLCanvasElement`, `CanvasRenderingContext2D` (tracking draw calls, strokes, fills, transforms) and `requestAnimationFrame`. |
| **Touch Simulator** | `touch_simulator.ts` | Dispatches synthetic `PointerEvents` / `TouchEvent` sequences (pointerdown, pointermove, pointerup) to test virtual joystick and buttons. |
| **Packet Generator** | `packet_generator.ts` | Generates chronological sequences of `WORLD_SNAPSHOT` packets with jitter, dropped frames and timestamp variations to test LERP interpolation. |

---

## 4. Harness Invariant Verification Scenarios

### Scenario: Deterministic Physics Replay
- **GIVEN** an engine instance with seed $S = 42$ and 2 snake entities
- **WHEN** 100 ticks are stepped with predefined input streams
- **THEN** repeating the exact run on a fresh engine with seed $S = 42$ yields 100% identical positions and scores.

### Scenario: Schema Compliance on All Outgoing Packets
- **GIVEN** the WebSocket handler broadcasting snapshots and death packets
- **WHEN** any packet is emitted by the server
- **THEN** `schema_validator.validate_packet(payload)` returns `True` without schema errors.
