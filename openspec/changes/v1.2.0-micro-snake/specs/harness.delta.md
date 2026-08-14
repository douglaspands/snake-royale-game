# Test Harness Delta Specification: v1.2.0-MICRO-SNAKE

## 1. Test Invariants
- **`INV-SNAKE-001` (Spawn Size Invariant):** Newly instantiated snake MUST have `len(trajectory) == 4` (1 head + 3 segments) and `mass == 3.0`.
- **`INV-BOOST-001` (Boost Gating Invariant):** Attempting to set `boost = True` when `mass <= 3.0` MUST evaluate to `snake.boost == False` and `snake.speed == 180.0`.
- **`INV-BOOST-002` (Boost Depletion Limit Invariant):** Continuous boosting with `mass > 3.0` MUST clamp mass at $\ge 3.0$, and MUST NOT reduce segment count below 3.
