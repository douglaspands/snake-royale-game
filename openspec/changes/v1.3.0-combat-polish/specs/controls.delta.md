# Controls Delta Specification: v1.3.0-COMBAT-POLISH

## 1. Universal Double-Tap & Hold Turbo Gesture
- **Mobile/Tablet Touch:** Double-tap within $300\text{ms}$ and holding the second touch activates turbo. Lifting the touch stops turbo.
- **Desktop/Mouse:** Left-click hold / Spacebar hold activates turbo.
- **HUD Cleanliness:** The fixed button is removed from the canvas viewport, freeing screen real estate in portrait and landscape orientations across tablets and smartphones.

## 2. Native Touch Scrolling for UI Elements (REQ-CTRL-006)
- **Problem:** Universal `* { touch-action: none; }` prevented native touch scrolling/swiping on touchscreens across the skin selector.
- **Resolution:** Isolate `touch-action: none;` strictly to `#game-canvas`. Configure `.skin-selector` and `.skin-opt` with `touch-action: pan-y; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;` to allow smooth finger swiping through all 12+ skin options.
