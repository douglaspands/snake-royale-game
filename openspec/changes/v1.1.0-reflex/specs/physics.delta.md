# OpenSpec Delta: Physics & Dynamic Turn Dynamics
**Domain:** `physics`  
**Change ID:** `v1.1.0-reflex`  
**Target:** `openspec/specs/physics/spec.md`  

---

## 1. Modified Requirements

### REQ-PHYS-002: Dynamic Turn Rate Model $\omega(M)$
Angular velocity clamping SHALL be determined dynamically as a function of the snake's mass $M$:

$$\omega(M) = \omega_{\text{min}} + \frac{\omega_{\text{base}} - \omega_{\text{min}}}{1 + 0.015 \cdot \max(0, M - 10)}$$

Where:
- Base Turn Rate: $\omega_{\text{base}} = 9.8\text{ rad/s}$ ($561.5^\circ/\text{s}$).
- Minimum Turn Rate: $\omega_{\text{min}} = 5.2\text{ rad/s}$ ($298.0^\circ/\text{s}$).
- Mass Scaling Factor: $k_{\text{mass}} = 0.015$.

Angular step per tick of duration $\Delta t$:
$$\Delta \theta = \text{clamp}\left(\text{normalize\_angle}(\theta_{\text{target}} - \theta_{\text{current}}), -\omega(M) \cdot \Delta t, +\omega(M) \cdot \Delta t\right)$$

---

## 2. Behavioral Scenarios

### Scenario: High-agility turn on spawn mass
- **GIVEN** a newly spawned snake with mass $M = 10.0$ and heading $\theta = 0$
- **WHEN** player requests target heading $\theta_{\text{target}} = \frac{\pi}{2}$ ($90^\circ$)
- **THEN** turning angular velocity is $9.8\text{ rad/s}$ and the $90^\circ$ turn completes in $\le 0.165\text{s}$ ($\le 5\text{ ticks}$ at 30Hz).
