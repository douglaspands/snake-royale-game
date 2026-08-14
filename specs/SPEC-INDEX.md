# 📜 Snake Royale — Specification Index (SDD)
**Active Specification Version:** `v1.0.0-VIPER`  
**Standard:** [OpenSpec](file:///home/douglas/Workspace/claude/snake-game/openspec/)  
**Status:** `ACTIVE / RATIFIED`  

---

## 📑 Specification Registry

| Document | Domain | Description | OpenSpec Reference |
| :--- | :--- | :--- | :--- |
| [`SPEC-v1.0.0-VIPER-PROTOCOL.md`](file:///home/douglas/Workspace/claude/snake-game/specs/SPEC-v1.0.0-VIPER-PROTOCOL.md) | Networking & WebSockets | JSON Schemas for `JOIN`, `JOIN_ACK`, `INPUT`, `WORLD_SNAPSHOT`, `PLAYER_DEATH`, `RESPAWN_REQUEST`. | [`openspec/specs/protocol/spec.md`](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/protocol/spec.md) |
| [`SPEC-v1.0.0-VIPER-PHYSICS.md`](file:///home/douglas/Workspace/claude/snake-game/specs/SPEC-v1.0.0-VIPER-PHYSICS.md) | Physics & Rules Engine | 2D kinematic equations, turn rate clamping, spatial hash grid, segment physics and food dynamics. | [`openspec/specs/physics/spec.md`](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/physics/spec.md) |
| [`SPEC-v1.0.0-VIPER-LIFECYCLE.md`](file:///home/douglas/Workspace/claude/snake-game/specs/SPEC-v1.0.0-VIPER-LIFECYCLE.md) | State Machines | Player and Arena Finite State Machines (Lobby $\rightarrow$ Playing $\rightarrow$ Dead $\rightarrow$ Respawning). | [`openspec/specs/lifecycle/spec.md`](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/lifecycle/spec.md) |
| [`SPEC-v1.0.0-VIPER-HARNESS.md`](file:///home/douglas/Workspace/claude/snake-game/specs/SPEC-v1.0.0-VIPER-HARNESS.md) | Test Harness & Invariants | Deterministic testing, virtual clock stepping, sleep-free execution and schema validation. | [`openspec/specs/harness/spec.md`](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/harness/spec.md) |
| [`SPEC-v1.0.0-VIPER-RENDERING.md`](file:///home/douglas/Workspace/claude/snake-game/specs/SPEC-v1.0.0-VIPER-RENDERING.md) | Rendering & Anti-Jitter | Screen-Space projection, integer pixel alignment and camera local tracking stabilization. | [`openspec/specs/rendering/spec.md`](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/rendering/spec.md) |

---

## 🔄 Version History & Changelog
- **v1.0.0-VIPER (Current):** Initial formal specification for real-time multiplayer Snake Battle Royale under OpenSpec Spec-Driven Development standard.
