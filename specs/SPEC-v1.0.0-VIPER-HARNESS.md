# SPECIFICATION: v1.0.0-VIPER-HARNESS
**Domain:** Test Harness Architecture & Quality Invariants  
**Compliance:** [OpenSpec Harness Domain](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/harness/spec.md)  

---

## 1. Test Harness Invariants
- **Zero Real-Time Sleep:** No `time.sleep()`, `asyncio.sleep(>0)`, or `setTimeout` during tests.
- **Deterministic Virtual Clock:** Physics ticks stepped via `virtual_clock.py` / `engine.step(dt=0.033)`.
- **Packet Schema Validation:** All WebSocket events tested against JSON schemas with `schema_validator.py`.
- **Sub-2s Execution Target:** Full test suite completes in $< 2.0\text{ seconds}$.
- **Frontend Mocks:** Complete simulation of `CanvasRenderingContext2D`, `requestAnimationFrame`, and multi-touch `PointerEvents`.
- **Minimum 80% Code Coverage Gate:** Automated tests must cover at least 80% of lines and statements across backend and frontend.
- **Static Quality Invariant (REQ-HARN-007):** 100% adherence to `ruff check`, `ruff format --check`, and `ty check` with zero errors, zero warnings, and zero type diagnostics.
