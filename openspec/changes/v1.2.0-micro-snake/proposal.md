# OpenSpec Proposal: v1.2.0-MICRO-SNAKE — Compact Initial Size (Length 3) & Mass-Draining Turbo Mechanics
**Change ID:** `v1.2.0-micro-snake`  
**Author:** AI Pair Programmer & Systems Architect  
**Status:** `PROPOSED`  

---

## 1. Intent & Problem Statement
In multiplayer Snake Battle Royale games (such as Slither.io), starting players should begin as agile, vulnerable, compact snakes (minimum size = 3 segments). This design ensures that:
1. Newly spawned players cannot instantly abuse turbo/boost to dash across the arena without first gathering mass.
2. The Turbo mechanism acts as a tactical risk/reward trade-off: boosting consumes snake mass/length in real-time, shedding boost pellets behind the tail.
3. The snake can never shrink below its minimum viable size ($L_{\min} = 3$ segments, $M_{\min} = 3.0$). When mass reaches $3.0$, the turbo mechanism automatically disengages and remains locked until the player consumes more food.

In `v1.0.0-VIPER` / `v1.1.0-REFLEX`, the initial snake spawned with $M = 10.0$ and $N = 25$ segments (10 base + 15), with a boost mass cutoff at $M = 15.0$. This proposal realigns the game loop and mechanics to spawn snakes at size 3, clamp boost consumption at size 3, and provide clear responsive feedback across both backend physics and client-side UI/CSP.

---

## 2. Scope & Target Capabilities
- **Compact Spawn State ($L = 3$):** Snakes spawn with exactly 3 segments trailing behind the head ($M = 3.0$).
- **Gated Turbo Activation ($M > 3.0$):** Turbo speed ($360\text{ px/s}$) can only be activated when $M > 3.0$. At spawn or minimum size ($M \le 3.0$), turbo is locked.
- **Mass Drain Down to Minimum Size:** While boosting, mass is drained at $\text{BOOST\_MASS\_DRAIN} = 4.0\text{ mass/s}$, dropping boost pellets. As soon as $M = 3.0$ ($L = 3$), boost shuts off automatically and speed returns to $180\text{ px/s}$.
- **Client-Side Prediction (CSP) Alignment:** `LocalPredictor` enforces the identical $M_{\min} = 3.0$ and $N_{\min} = 3$ kinematic constraints to avoid visual snapping.
- **Dynamic HUD Feedback:** Mobile Turbo button and Desktop UI display a clear disabled/dim state when $M \le 3.0$, becoming active and glowing when $M > 3.0$.
- **Zero-Sleep Deterministic Harness:** 100% test coverage with automated unit tests for spawn size, boost gating, and boost depletion.

---

## 3. Requirements (EARS & Gherkin)

### REQ-PHYS-010: Minimum Snake Spawn & Base Size
- **EARS:** *WHERE a player joins the arena or respawns, the server SHALL initialize the snake with $M = 3.0$ and exactly 3 body segments.*
- **GIVEN** a newly connected player joins the match
- **WHEN** the snake entity is instantiated
- **THEN** `snake.mass` equals `3.0` and `snake.get_body_segments()` contains exactly 3 segments.

### REQ-PHYS-011: Turbo Gating at Minimum Size
- **EARS:** *WHEN a player triggers turbo input while $M \le 3.0$, the server SHALL maintain base speed ($180\text{ px/s}$) and MUST NOT drain mass.*
- **GIVEN** a snake with $M = 3.0$
- **WHEN** the input packet is received with `boost = true`
- **THEN** `snake.boost` is `false`, `snake.speed` is `180.0`, and mass remains `3.0`.

### REQ-PHYS-012: Turbo Mass Drain & Auto-Cutoff
- **EARS:** *WHILE turbo is active ($M > 3.0$), the server SHALL drain mass at $4.0\text{ mass/s}$ and spawn boost pellets until mass drops to $3.0$, at which point boost SHALL immediately deactivate.*
- **GIVEN** a snake with $M = 5.0$ boosting at $360\text{ px/s}$
- **WHEN** time advances by $\Delta t = 0.5\text{s}$ (consuming $2.0$ mass units)
- **THEN** `snake.mass` becomes `3.0`, `snake.boost` transitions to `false`, and speed becomes `180.0 px/s`.

---

## 4. Success Criteria
1. Initial snake spawns with length = 3.
2. Turbo cannot be used at minimum size 3.
3. Turbo consumes length/mass down to 3, then cuts off.
4. Backend Quality Gate: 100% pass on `ruff check`, `ruff format --check`, `ty check`, `pytest` (coverage $\ge 80\%$).
5. Frontend Quality Gate: 100% pass on `vitest` (coverage $\ge 80\%$) and `vite build`.
