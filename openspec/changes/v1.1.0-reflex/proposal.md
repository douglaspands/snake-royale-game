# OpenSpec Proposal: v1.1.0-REFLEX — Ultra-Precision & Low-Latency Command Engine
**Change ID:** `v1.1.0-reflex`  
**Author:** AI Pair Programmer & Lead Systems Architect  
**Status:** `APPROVED`  

---

## 1. Intent & Problem Statement
In fast-paced competitive multiplayer games (such as Slither.io, Curve Fever, and Snake Battle Royale), command responsiveness and steering precision are the single most important factor determining player satisfaction and competitive fairness.

In the initial `v1.0.0-VIPER` release, command execution suffered from an aggregate perceptual lag of $\approx 500-600\text{ms}$ due to:
1. Hardcoded $100\text{ms}$ LERP render delay on client applied unconditionally to the local player snake.
2. Severely clamped angular turn velocity ($\omega = 4.5\text{ rad/s}$), requiring $350\text{ms}$ to execute a standard $90^\circ$ sharp turn.
3. Periodic polling input dispatch at $33.3\text{ms}$ intervals delaying instantaneous keyboard/touch/mouse direction changes.
4. Lack of Client-Side Prediction (CSP) and local snapshot reconciliation for the player's own snake entity.

This proposal specifies **v1.1.0-REFLEX**: a comprehensive upgrade delivering $<16\text{ms}$ visual command response (1 frame at 60 FPS), dynamic mass-scaled turn rates ($\omega(M) \in [5.2, 9.8]\text{ rad/s}$), immediate event-driven input dispatch, client-side kinematic prediction with anti-snap reconciliation, and adaptive jitter buffering ($35-45\text{ms}$) for remote entities.

---

## 2. Scope & Target Capabilities
- **Zero-Lag Visual Steering:** Local snake responds in $<16\text{ms}$ to keyboard/mouse/touch inputs via Client-Side Prediction (CSP).
- **Agile Dynamic Turn Rate:** Responsive turning model $\omega(M)$ providing $9.8\text{ rad/s}$ base agility down to $5.2\text{ rad/s}$ for large snakes.
- **Event-Driven Instant Input Dispatch:** Immediate WebSocket transmission upon significant heading changes ($\Delta \theta \ge 0.02\text{ rad}$) and key state transitions, coupled with sequence-numbered stream at 60Hz.
- **Hermite/Exponential Anti-Snap Reconciliation:** Seamless error decay reconciling predicted client trajectory with authoritative server snapshots without visual teleportation.
- **Adaptive Jitter Buffer for Remote Entities:** Lowered remote interpolation delay from static $100\text{ms}$ to dynamic $35-45\text{ms}$.
- **Sub-2-Second Zero-Sleep Test Harness:** Deterministic validation with virtual clock and simulated packet latency.

---

## 3. User Stories
### Story 1: Competitive Player
*As a competitive player, when I move my mouse, press WASD, or swipe the joystick, I want my snake's head to turn instantly without sluggishness or delay, so that I can execute sharp cuts, avoid collisions, and encircle opponents with sub-millisecond precision.*

### Story 2: Mobile / Touch Player
*As a mobile player, I want micro-deadzone filtering on the virtual joystick and instant turn dispatch when dragging my finger, so that small finger jitter doesn't cause erratic turns while intentional turns happen immediately.*

### Story 3: Network-Constrained Player
*As a player on varying network conditions, I want the client to smoothly reconcile any positional drift with server snapshots without jarring visual snaps, while remote snakes remain smooth with adaptive jitter buffering.*

---

## 4. Success Criteria
1. Local visual turn response time is $<16\text{ms}$ from input trigger.
2. $90^\circ$ turn execution time reduced from $350\text{ms}$ to $\approx 160\text{ms}$ for base mass.
3. Remote interpolation buffer reduced from $100\text{ms}$ to $35-45\text{ms}$.
4. Backend test suite passes 100% with coverage $\ge 80\%$ in $<2.0\text{s}$ (zero sleep).
5. Frontend test suite passes 100% with coverage $\ge 80\%$ in $<2.0\text{s}$ (zero sleep).
6. 100% pass on all project quality tools (`ruff check`, `ruff format --check`, `ty check`, `vitest`, `tsc`, `vite build`).
