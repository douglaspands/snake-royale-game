# OpenSpec Delta: Physics Specification
**Change ID:** `v1.0.0-viper`  
**Domain:** `physics`  

## ADDED Requirements
- `REQ-PHYS-001`: Arena Geometry $3000 \times 3000\text{ px}$ with strict boundary collision.
- `REQ-PHYS-002`: Base speed $180\text{ px/s}$ and Boost speed $360\text{ px/s}$ with mass shedding ($4.0\text{ mass/s}$).
- `REQ-PHYS-003`: Angular turn rate clamped at $\omega = 4.5\text{ rad/s}$.
- `REQ-PHYS-004`: Dynamic head and body radii based on mass $M$.
- `REQ-PHYS-005`: Spatial Hash Partitioning ($100\text{ px}$ cell size) with head-to-body and head-to-head collision resolution.
- `REQ-PHYS-006`: Food pellet mechanics (ambient target density 600, boost drops, corpse pellets with 80% mass conservation).
