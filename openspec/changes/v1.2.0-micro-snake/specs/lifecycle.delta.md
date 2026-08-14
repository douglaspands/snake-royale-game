# Lifecycle Delta Specification: v1.2.0-MICRO-SNAKE

## 1. FSM State Updates
```diff
  | State | Behavior | Transitions |
  |---|---|---|
- | `BOOSTING` | Snake travels at v_turbo, shedding mass. | Mass is decremented. Auto-transitions to `PLAYING` if mass drops below 15. |
+ | `BOOSTING` | Snake travels at v_turbo, shedding mass. | Mass is decremented. Auto-transitions to `PLAYING` if mass drops to 3.0 (minimum size). |
```

## 2. Spawn State
- When state transitions from `LOBBY` -> `PLAYING`, initial entity parameters are:
  - `mass = 3.0`
  - `segments = 3`
  - `boost = false` (locked until `mass > 3.0`).
