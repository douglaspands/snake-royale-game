# SPECIFICATION: v1.0.0-VIPER-RENDERING
**Domain:** Client Rendering Pipeline & Visual Stabilization  
**Compliance:** [OpenSpec Rendering Domain](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/rendering/spec.md)  

---

## 1. Stabilization Invariants
1. **Screen-Space Nameplates:** Entity names and badges must be projected to Screen Space and rounded to integer pixels (`Math.round`) prior to calling `fillText()` or `strokeText()`.
2. **Synchronous Camera Lock:** Camera tracking for the active local player must synchronize directly to the snake head without exponential damping lag, preventing relative sub-pixel drift.
3. **Pill Badge Layout:** Names are enclosed in a stabilized semi-transparent rounded pill container for maximum contrast and zero glyph vibration.
