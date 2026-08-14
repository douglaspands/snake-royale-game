# SPECIFICATION: v1.0.0-VIPER-PHYSICS
**Domain:** Game Physics, Geometry & Collision Engine  
**Compliance:** [OpenSpec Physics Domain](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/physics/spec.md)  

---

## 1. Arena Geometry
- Arena dimensions: $Width = 3000\text{ px}$, $Height = 3000\text{ px}$.
- Origin $(0, 0)$ at top-left.
- Hard border collision: $x \le R_{\text{head}}$ or $x \ge W - R_{\text{head}}$ or $y \le R_{\text{head}}$ or $y \ge H - R_{\text{head}} \implies \text{DEATH}$.

---

## 2. Dynamic Movement Parameters
- **Base Speed:** $v_{\text{base}} = 180\text{ px/s}$ ($6.0\text{ px/tick}$ at 30 Hz).
- **Turbo/Boost Speed:** $v_{\text{turbo}} = 360\text{ px/s}$ ($12.0\text{ px/tick}$ at 30 Hz).
- **Turn Rate Limit:** $\omega = 4.5\text{ rad/s}$ ($257.8^\circ/\text{s}$). Clamped per tick by $\Delta \theta_{\text{max}} = \omega \cdot \Delta t$.
- **Mass Mechanics:**
  - Initial mass: $M_0 = 10.0$.
  - Boost mass threshold: $M \ge 15.0$.
  - Boost mass drain: $4.0\text{ mass/s}$ ($0.133\text{ mass/tick}$).
- **Radii Formulas:**
  - $R_{\text{head}}(M) = 14 + 0.8 \cdot \sqrt{M}$
  - $R_{\text{body}}(M) = 12 + 0.7 \cdot \sqrt{M}$
- **Segment Follow Mechanics:**
  - Distance between consecutive segment trajectory nodes: $D_{\text{segment}} = 8\text{ px}$.
  - Target segment count: $L(M) = 10 + \lfloor 1.5 \cdot M \rfloor$.

---

## 3. Spatial Partitioning & Collision Resolution
- Uniform grid cell size: $100 \times 100\text{ px}$.
- Body segments register in grid hash keys $(cx, cy) = (\lfloor x/100 \rfloor, \lfloor y/100 \rfloor)$.
- Head queries neighboring 9 cells for potential collisions.
- Distance threshold for body collision: $d < (R_{\text{head}} + R_{\text{body}}) \times 0.85$.
- Corpse food generation: when a snake dies, $80\%$ of its total mass is dropped along body coordinates.
