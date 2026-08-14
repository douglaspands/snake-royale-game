# OpenSpec: Client Rendering & Visual Stabilization Specification
**Domain:** `rendering`  
**Version:** `1.0.0-VIPER`  
**Status:** `ACTIVE`  

---

## 1. Overview
This specification governs client-side Canvas 2D rendering pipeline precision, visual stabilization, camera target synchronization, and sub-pixel text anti-jitter requirements.

---

## 2. Requirements & Stabilization Rules

### REQ-REND-001: Screen-Space Nameplate Projection & Pixel-Alignment
To eliminate sub-pixel font hinting vibrations caused by fractional world-transform matrices, all floating entity nameplates and player labels MUST be projected from world coordinates $(x_w, y_w)$ into screen coordinates $(x_s, y_s)$ and rounded to integer device pixels prior to text rasterization:
$$x_{\text{screen}} = \text{round}\left( \frac{W_{\text{viewport}}}{2} + (x_w - x_{\text{cam}}) \cdot Z \right)$$
$$y_{\text{screen}} = \text{round}\left( \frac{H_{\text{viewport}}}{2} + (y_w - y_{\text{cam}}) \cdot Z - (R_{\text{head}} + 14) \cdot Z \right)$$
Where $Z$ is camera zoom.

Text rasterization MUST NOT occur inside the scaled/translated world transformation context.

---

### REQ-REND-002: Camera Local Player Target Synchronization
When following the active local player's snake entity during gameplay, the camera center $(x_{\text{cam}}, y_{\text{cam}})$ MUST lock synchronously to the interpolated head position without exponential damping oscillation lag:
$$x_{\text{cam}} = x_{\text{head}}, \quad y_{\text{cam}} = y_{\text{head}}$$
This guarantees that relative screen-space coordinate distance between the local snake's head and the screen center is mathematically invariant frame-to-frame.

---

### REQ-REND-003: Stabilized Pill Badge Nameplate Design
Every active snake nameplate SHALL be rendered with:
1. Semi-transparent dark pill container (`rgba(10, 15, 26, 0.75)`) with rounded corners (`radius = 6px`).
2. High-contrast bold typography (`11px "Inter", sans-serif`).
3. Integer-aligned background pill bounding box centered on $(x_{\text{screen}}, y_{\text{screen}})$.

---

## 3. Scenarios (GIVEN / WHEN / THEN)

### Scenario: Screen-space integer pixel alignment of nameplate
- **GIVEN** a snake head at fractional world coordinates $(502.348, 804.819)$
- **WHEN** the renderer computes the nameplate draw position
- **THEN** the output $(x_{\text{screen}}, y_{\text{screen}})$ values are strictly integer numbers (`Number.isInteger(x) === true`) and font rendering occurs in screen-space context.

### Scenario: Local camera synchronization without micro-lag
- **GIVEN** a local player moving at velocity $v = 180\text{ px/s}$
- **WHEN** each animation frame steps forward
- **THEN** $(x_{\text{head}} - x_{\text{cam}}) == 0$ and the local snake head position on screen is constant at $(\frac{W}{2}, \frac{H}{2})$.
