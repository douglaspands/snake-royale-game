## Why
In multiplayer Snake Battle Royale games, starting players should begin as agile, vulnerable, compact snakes (minimum size = 3 segments). This ensures that newly spawned players cannot instantly abuse turbo/boost without first gathering mass, and turbo acts as a tactical risk/reward trade-off by consuming mass down to minimum size 3 with auto-cutoff.

## What Changes
- Compact spawn state (initial length 3, mass 3.0).
- Gated turbo activation (requires mass > 3.0).
- Mass drain down to minimum size 3 with auto-cutoff.
- Client-Side Prediction (CSP) and HUD updates aligning with minimum size 3.

## Capabilities

### New Capabilities

### Modified Capabilities
- `physics`: Spawn size 3, boost gating and mass drain mechanics.
- `lifecycle`: Spawn and respawn state initial mass 3.0.

## Impact
- Backend snake physics and game engine (`server/app/game/snake.py`, `server/app/game/engine.py`).
- Frontend predictor and HUD (`client/src/net/local_predictor.ts`, `client/src/ui/hud.ts`).
