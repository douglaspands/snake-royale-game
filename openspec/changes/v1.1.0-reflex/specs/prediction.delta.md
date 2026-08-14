# OpenSpec Specification: Client-Side Prediction & Kinematic Reconciliation
**Domain:** `prediction`  
**Version:** `1.1.0-REFLEX`  
**Status:** `ACTIVE`  

---

## 1. Overview
This specification defines the Client-Side Prediction (CSP) pipeline and error reconciliation algorithm for the local player's snake entity.

---

## 2. Requirements

### REQ-PRED-001: Zero-Lag Local Kinematic Simulation
The client MUST simulate the local snake's head position, angle, and inverse kinematic body segments forward in time on every animation frame using identical equations to the authoritative physics model:
$$P_{h}(t + \Delta t) = P_{h}(t) + (\cos\theta, \sin\theta) \cdot v(boost, M) \cdot \Delta t$$
$$\theta(t + \Delta t) = \text{step\_angle}(\theta(t), \theta_{\text{target}}, \omega(M) \cdot \Delta t)$$

### REQ-PRED-002: Unacknowledged Input Ring Buffer
The client MUST maintain a circular ring buffer storing $(seq, \theta_{\text{target}}, boost, \Delta t, timestamp)$ for all dispatched input frames not yet acknowledged by the server.

### REQ-PRED-003: Exponential Error Decay Reconciliation (Anti-Snap)
When an authoritative `WORLD_SNAPSHOT` is received:
1. Inputs with $seq \le seq_{\text{ack}}$ are pruned from the ring buffer.
2. The discrepancy vector $\vec{\epsilon} = P_{\text{predicted}} - P_{\text{server\_replayed}}$ is calculated.
3. If $\|\vec{\epsilon}\| > 0$, the render position applies smoothed decay:
   $$P_{\text{visual}}(t) = P_{\text{predicted}}(t) + \vec{\epsilon} \cdot e^{-\lambda t}, \quad \lambda = 15.0$$

---

## 3. Scenarios

### Scenario: Local frame rate independent prediction
- **GIVEN** a client running at 120 FPS
- **WHEN** user moves pointer continuously
- **THEN** local snake renders at 120 FPS smoothly without waiting for 30Hz server ticks.
