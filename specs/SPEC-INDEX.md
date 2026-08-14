# 📜 Snake Royale — Specification Index (SDD)
**Active Specification Version:** `v1.3.0-COMBAT-POLISH`  
**Standard:** [OpenSpec](file:///home/douglas/Workspace/claude/snake-game/openspec/)  
**Status:** `ACTIVE / RATIFIED`  

---

## 📑 Specification Registry

| Document | Domain | Description | OpenSpec Reference |
| :--- | :--- | :--- | :--- |
| [`SPEC-v1.0.0-VIPER-PROTOCOL.md`](file:///home/douglas/Workspace/claude/snake-game/specs/SPEC-v1.0.0-VIPER-PROTOCOL.md) | Networking & WebSockets | JSON Schemas for `JOIN`, `JOIN_ACK`, `INPUT`, `WORLD_SNAPSHOT`, `PLAYER_DEATH`, `RESPAWN_REQUEST`. | [`openspec/specs/protocol/spec.md`](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/protocol/spec.md) |
| [`SPEC-v1.0.0-VIPER-PHYSICS.md`](file:///home/douglas/Workspace/claude/snake-game/specs/SPEC-v1.0.0-VIPER-PHYSICS.md) | Physics & Rules Engine | Pure contact physics, no self-collision, size 3 spawn, turbo gating and 1:1 mass drain. | [`openspec/specs/physics/spec.md`](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/physics/spec.md) |
| [`SPEC-v1.0.0-VIPER-LIFECYCLE.md`](file:///home/douglas/Workspace/claude/snake-game/specs/SPEC-v1.0.0-VIPER-LIFECYCLE.md) | State Machines | Player and Arena Finite State Machines (Lobby $\rightarrow$ Playing $\rightarrow$ Dead $\rightarrow$ Respawning). | [`openspec/specs/lifecycle/spec.md`](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/lifecycle/spec.md) |
| [`SPEC-v1.0.0-VIPER-HARNESS.md`](file:///home/douglas/Workspace/claude/snake-game/specs/SPEC-v1.0.0-VIPER-HARNESS.md) | Test Harness & Invariants | Deterministic testing, virtual clock stepping, sleep-free execution and schema validation. | [`openspec/specs/harness/spec.md`](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/harness/spec.md) |
| [`SPEC-v1.0.0-VIPER-RENDERING.md`](file:///home/douglas/Workspace/claude/snake-game/specs/SPEC-v1.0.0-VIPER-RENDERING.md) | Rendering & Anti-Jitter | 12+ mixed skins, clock-synchronized anti-jitter LERP, impact particles, Double-Tap & Hold controls. | [`openspec/specs/rendering/spec.md`](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/rendering/spec.md) |

---

## 🔄 Version History & Changelog
- **v1.3.0-COMBAT-POLISH (Current):** Universal Double-Tap & Hold Turbo gesture (tablet/mobile), 12+ vibrant mixed/bicolor skins, clock-synchronized anti-jitter interpolator, pure-contact collision physics (no self-collision), and Token Efficiency guidelines.
- **v1.2.0-MICRO-SNAKE:** Initial spawn length 3 ($M = 3.0$), turbo gating at minimum size ($M \le 3.0$), and mass-draining turbo mechanics with 1:1 pellet conservation down to size 3 auto-cutoff.
- **v1.1.0-REFLEX:** Ultra-precision low-latency command engine (<16ms CSP, agile dynamic turning $\omega(M)$, anti-snap reconciliation, adaptive jitter buffer).
- **v1.0.0-VIPER:** Initial formal specification for real-time multiplayer Snake Battle Royale under OpenSpec Spec-Driven Development standard.
