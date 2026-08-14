## Why
Following user playtesting across mobile, tablet, and desktop environments, critical areas were identified for architectural refinement: universal double-tap turbo gesture, 12+ mixed skins for 10+ player visual distinction, remote snake jitter elimination via synchronized arrival timestamps, pure-contact collision physics without self-collision, and token efficiency workspace standards.

## What Changes
- Implement universal Double-Tap & Hold turbo gesture across desktop and mobile.
- Implement 12+ vibrant mixed/bicolor and patterned skins.
- Implement arrival timestamp tracking in EntityInterpolator to eliminate remote snake jitter.
- Implement pure-contact collision physics removing self-collision and calibrating hitboxes.
- Implement elimination particle explosions.

## Capabilities

### New Capabilities

### Modified Capabilities
- `physics`: Pure-contact collision resolution with no self-collision.
- `rendering`: 12+ skin styles and death particle explosion effects.

## Impact
- Frontend input, rendering, and interpolation updated (`client/src/input/`, `client/src/render/`, `client/src/net/`).
- Backend engine collision detection updated (`server/app/game/engine.py`).
