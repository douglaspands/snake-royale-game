# OpenSpec Proposal: v1.3.0-COMBAT-POLISH — Double-Tap Turbo, 12+ Mixed Skins, Anti-Jitter Smoothing, Pure-Contact Physics & Token Efficiency
**Change ID:** `v1.3.0-combat-polish`  
**Author:** AI Pair Programmer & Systems Architect  
**Status:** `APPROVED`  

---

## 1. Intent & Problem Statement
Following user playtesting across mobile, tablet, and desktop environments, five critical areas were identified for architectural refinement:
1. **Turbo Button Accessibility on Tablets & Portrait Smartphones:** The fixed on-screen turbo button was hidden on tablets (due to viewport media queries) and obstructed the minimap/arena view in portrait mode. A clean, universal **Double-Tap & Hold** gesture is required.
2. **Skin Variety & 10+ Player Visual Distinction:** The existing 5 solid skins are insufficient for a 10-player battle royale. A diverse palette of **12+ skins with mixed/bicolor and patterned segments** is needed for instantaneous player identification.
3. **Remote Snake Jitter (Time Epoch Desync):** Enemy snakes exhibited severe visual vibration due to a clock epoch mismatch in `EntityInterpolator` (server UTC timestamps vs `performance.now()` client timestamps).
4. **Phantom / Ghost Deaths (Physics Hitbox False Positives):** Players occasionally suffered deaths without visible contact due to self-collision false positives during sharp turns and oversized collision thresholds. Collisions must occur **strictly upon visible physical contact** with opponents or arena borders, accompanied by vivid impact feedback.
5. **Token Efficiency Standards (AI Ingestion & Network Payload Compaction):** Preventing AI context bloating from build artifacts/caches via `.ignore` / `.antigravityignore` and minimizing network payload tokenization via strict floating-point precision rounding.

---

## 2. Scope & Target Capabilities
- **Double-Tap & Hold Turbo Gesture:** Universal multi-touch gesture on mobile/tablet (tap once, tap & hold to boost, release to stop) with desktop keyboard/mouse parity, removing obstructive fixed UI buttons.
- **12+ Dynamic Mixed/Bicolor Skins:** Support for 12+ vibrant skins featuring dual-color alternating segments, cosmic gradients, hazard stripes, and candy patterns, optimized for 10+ concurrent players.
- **Smooth Anti-Jitter Interpolator:** Client-side arrival timestamp tracking in `EntityInterpolator` providing silky-smooth 60-120 FPS remote snake movement with zero jitter.
- **Pure-Contact Physics & Elimination of Self-Collision:** Removal of self-body collision, exact hitbox radius alignment ($d < R_{\text{head}} + R_{\text{body}} - 2.0\text{px}$), and clear visual impact particle feedback upon elimination.
- **Token Efficiency & Workspace Optimization:** Ignore files (`.ignore`, `.antigravityignore`), modular source code (<300 lines), and 1-decimal coordinate serialization saving $>40\%$ network payload overhead.
- **Zero-Sleep Deterministic Harness:** 100% test coverage with automated unit tests for double-tap input, interpolation time-sync, and pure contact collision resolution.
