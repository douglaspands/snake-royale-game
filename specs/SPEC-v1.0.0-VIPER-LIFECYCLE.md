# SPECIFICATION: v1.0.0-VIPER-LIFECYCLE
**Domain:** Player and Room Finite State Machines  
**Compliance:** [OpenSpec Lifecycle Domain](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/lifecycle/spec.md)  

---

## 1. Player FSM
- **`LOBBY`:** Client WebSocket connected. No entity in physics world.
- **`PLAYING`:** Active in arena at base speed. Eating food and increasing mass.
- **`BOOSTING`:** Active at turbo speed, shedding mass and spawning boost pellets. Transitions back to `PLAYING` if $M < 15$ or boost is released.
- **`DEAD`:** Eliminated by wall or snake body. Corpse converted to food pellets. Awaiting respawn or disconnect.
- **`RESPAWNING`:** Engine determines safe spawn location ($>150\text{ px}$ from other snakes) and transitions to `PLAYING`.

---

## 2. Room Lifecycle
- Room maintains minimum 600 food pellets across the $3000 \times 3000$ arena.
- Room manages concurrent player sessions, broadcasts snapshots at 30-40 Hz, and calculates real-time leaderboards.
