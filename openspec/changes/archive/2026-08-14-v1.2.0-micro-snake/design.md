# OpenSpec Design: v1.2.0-MICRO-SNAKE — Technical Architecture & Mathematical Models
**Change ID:** `v1.2.0-micro-snake`  
**Status:** `PROPOSED`  

---

## 1. Mathematical Formulation

### 1.1 Segment Count & Mass Relationship
Let $M \ge 3.0$ be the current mass of the snake.
- Minimum mass: $M_{\min} = 3.0$
- Base segment count: $N_{\text{base}} = 3$
- Growth factor: $k_{\text{growth}} = 1.5\text{ segments/mass}$

The target segment count $N_{\text{segments}}(M)$ is given by:
$$N_{\text{segments}}(M) = N_{\text{base}} + \lfloor \max(0.0, M - M_{\min}) \times k_{\text{growth}} \rfloor$$

At initial spawn ($M = 3.0$):
$$N_{\text{segments}}(3.0) = 3 + \lfloor 0.0 \times 1.5 \rfloor = 3$$

### 1.2 Speed & Turbo Gating
Let $I_{\text{boost}} \in \{0, 1\}$ be the player's boost input flag.
The effective boost state $B(t)$ and velocity $v(t)$ are:
$$B(t) = I_{\text{boost}} \land (M(t) > M_{\min})$$

$$v(t) = \begin{cases} 
360.0\text{ px/s} & \text{if } B(t) = 1 \\
180.0\text{ px/s} & \text{if } B(t) = 0
\end{cases}$$

### 1.3 Mass Depletion Dynamics
While $B(t) = 1$:
$$\frac{dM}{dt} = -R_{\text{drain}}, \quad R_{\text{drain}} = 4.0\text{ mass/s}$$
$$M(t + \Delta t) = \max(M_{\min}, M(t) - R_{\text{drain}} \Delta t)$$

When $M(t + \Delta t) = M_{\min} = 3.0$, $B(t + \Delta t)$ transitions to $0$.

---

## 2. State Machine Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> SPAWNED : Join / Respawn (M = 3.0, N = 3)
    SPAWNED --> PLAYING_MIN_SIZE : Move at Base Speed (180 px/s)
    PLAYING_MIN_SIZE --> PLAYING_MIN_SIZE : Boost Attempt (BLOCKED - M <= 3.0)
    PLAYING_MIN_SIZE --> PLAYING_GROWING : Eat Pellet (M > 3.0)
    PLAYING_GROWING --> BOOSTING : Boost Pressed (M > 3.0, v = 360 px/s)
    BOOSTING --> BOOSTING : Drain Mass (4.0/s) & Drop Pellets
    BOOSTING --> PLAYING_GROWING : Boost Released (M > 3.0)
    BOOSTING --> PLAYING_MIN_SIZE : Mass reaches 3.0 (AUTO-CUTOFF)
    PLAYING_GROWING --> DEAD : Collision
    BOOSTING --> DEAD : Collision
    PLAYING_MIN_SIZE --> DEAD : Collision
```

---

## 3. Component Architecture & Synchronization

```mermaid
graph TD
    subgraph Server [Backend - Authoritative Physics]
        SE[GameEngine] --> SS[Snake Entity: M_min=3.0, N_base=3]
        SS --> SD[Turbo Mass Drain & Pellet Dropper]
        SE --> SB[World Snapshot Broadcast @ 30Hz]
    end

    subgraph Client [Frontend - Zero-Lag Reflex UI]
        CP[LocalPredictor CSP: M_min=3.0, N_base=3] --> CR[Canvas 2D Renderer]
        SB --> CI[Interpolator & Reconciler]
        CI --> CP
        HUD[HUD Manager: Turbo Button Active/Disabled State] --> CP
    end
```

---

## 4. UI/UX Interaction Design
1. **Mobile Turbo Button (`.mobile-turbo-btn`):**
   - When $M \le 3.0$: `.disabled` class added -> visual opacity $0.4$, grayscale, no press animation, pointer-events pass-through / inert.
   - When $M > 3.0$: `.disabled` removed -> vibrant cyan/blue glow, interactive touch response.
2. **Desktop Controls Hint:**
   - HUD text: `Space (Turbo - Requires Mass > 3.0)` / `📱 Tap Turbo (Requires Mass > 3.0)`.
