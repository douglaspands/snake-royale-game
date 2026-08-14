# OpenSpec: Game Physics & Rules Engine Specification
**Domain:** `physics`  
**Version:** `1.2.0-MICRO-SNAKE`  
**Status:** `ACTIVE`  

---

## 1. Arena Geometry
- **Arena Dimensions:** Width $W = 3000\text{ px}$, Height $H = 3000\text{ px}$.
- **Coordinate System:** Origin $(0, 0)$ is at top-left; bounding boundaries are $x \in [0, W]$ and $y \in [0, H]$.
- **Boundary Collision:** If head distance to arena edge $\le R_{head}$, the snake immediately dies.

---

## 2. Dynamic Snake Parameters

### 2.1 Velocity & Acceleration
- **Base Speed:** $v_{\text{base}} = 180\text{ px/s}$ (at 30 Hz, $\Delta s = 6.0\text{ px/tick}$).
- **Boost Speed:** $v_{\text{turbo}} = 360\text{ px/s}$ (at 30 Hz, $\Delta s = 12.0\text{ px/tick}$).
- **Minimum Mass to Boost:** $M > 3.0$ (blocked at spawn/minimum size $M \le 3.0$).
- **Boost Mass Drain:** When boosting, mass is drained at $\Delta M = 4.0\text{ mass/s}$ ($\approx 0.133\text{ mass/tick}$) down to $M = 3.0$ with auto-cutoff. Ejected mass spawns glowing boost pellets behind the tail conserving mass 1:1 ($\sum \text{pellet.val} = \Delta M_{\text{lost}}$).

### 2.2 Dynamic Agile Turn Rate $\omega(M)$
The snake's turning agility is dynamically governed as a function of mass $M$:
$$\omega(M) = \omega_{\text{min}} + \frac{\omega_{\text{base}} - \omega_{\text{min}}}{1 + 0.015 \cdot \max(0, M - 3.0)}$$
Where:
- $\omega_{\text{base}} = 9.8\text{ rad/s}$ ($561.5^\circ/\text{s}$ at spawn mass $M = 3.0$).
- $\omega_{\text{min}} = 5.2\text{ rad/s}$ ($298.0^\circ/\text{s}$ for giant snakes).

Angular step per tick of duration $\Delta t$:
$$\Delta \theta = \text{clamp}\left(\text{normalize\_angle}(\theta_{\text{target}} - \theta_{\text{current}}), -\omega(M) \cdot \Delta t, +\omega(M) \cdot \Delta t\right)$$

### 2.3 Segment Physics & Length
- **Head Radius:** $R_{\text{head}}(M) = 14 + \sqrt{M} \times 0.8\text{ px}$.
- **Body Radius:** $R_{\text{body}}(M) = 12 + \sqrt{M} \times 0.7\text{ px}$.
- **Segment Spacing:** Fixed distance $D_{\text{segment}} = 8\text{ px}$ between consecutive recorded trajectory points.
- **Total Body Length:** $L(M) = 3 + \lfloor \max(0, M - 3.0) \times 1.5 \rfloor$ segments.
- Segment follow mechanics follow inverse kinematics (each segment moves toward the previous segment preserving distance $D_{\text{segment}}$).

---

## 3. Food Pellets & Mass Absorption

### 3.1 Pellet Types
1. **Ambient Food:** Randomly distributed across the arena. Value $V_{\text{ambient}} = 1.0\text{ mass}$. Spawn target density: 600 active pellets in the arena.
2. **Boost Drop Pellets:** Ejected behind boosting snakes with 1:1 mass conservation. Value $V_{\text{boost}} = 1.0\text{ mass}$.
3. **Corpse Food Pellets:** When a snake of mass $M$ dies, it drops $K = \min(50, \lfloor L \times 0.7 \rfloor)$ food pellets along its body coordinates, conserving $80\%$ of its mass ($V_{\text{corpse}} = \frac{0.8 \times M}{K}$).

### 3.2 Absorption Radius
A food pellet at $(x_f, y_f)$ is absorbed by a snake head at $(x_h, y_h)$ when:
$$\text{dist}(head, food) \le R_{\text{head}} + R_{\text{food}}$$
Where $R_{\text{food}} = 6\text{ px}$.

---

## 4. Collision Resolution

### 4.1 Spatial Partitioning
The arena is partitioned into a uniform Spatial Hash Grid of cell size $C = 100\text{ px}$ to reduce pairwise collision checks from $O(N^2)$ to $O(N)$.

### 4.2 Head-to-Body Collision
For every active snake $A$ with head position $H_A$:
For every active snake $B$ (where $B \neq A$ or $B = A$ for segments index $\ge 6$):
For every body segment $S_{B, i}$:
$$\text{If } \|H_A - S_{B, i}\| < (R_{\text{head}}(M_A) + R_{\text{body}}(M_B)) \times 0.85 \implies \text{Snake } A \text{ dies immediately.}$$

### 4.3 Head-to-Head Collision
If head $H_A$ collides with head $H_B$:
- If $M_A > M_B \times 1.1$, Snake $B$ dies and Snake $A$ survives.
- If $M_B > M_A \times 1.1$, Snake $A$ dies and Snake $B$ survives.
- Otherwise, both snakes die.

---

## 5. Scenarios (GIVEN / WHEN / THEN)

### Scenario: Snake Growth on Food Consumption
- **GIVEN** a snake with mass $M = 10.0$ and head at $(100, 100)$
- **WHEN** a food pellet of value $1.0$ is within distance $\le R_{\text{head}} + R_{\text{food}}$
- **THEN** food is removed and snake mass increases to $11.0$, increasing body segment count.

### Scenario: Snake Wall Collision Death
- **GIVEN** a snake moving toward $x = 0$ with head radius $R = 15$
- **WHEN** $x_{\text{head}} \le 15$
- **THEN** the snake status transitions to `DEAD` and corpse pellets are spawned.
