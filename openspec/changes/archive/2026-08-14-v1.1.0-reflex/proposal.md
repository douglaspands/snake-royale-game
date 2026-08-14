## Why
In fast-paced competitive multiplayer games, command responsiveness and steering precision are the single most important factor determining player satisfaction and competitive fairness.

In the initial v1.0.0-VIPER release, command execution suffered from perceptual lag due to hardcoded 100ms LERP delay, clamped angular turn rates, periodic polling input dispatch, and lack of Client-Side Prediction (CSP).

This change delivers <16ms visual command response, dynamic mass-scaled turn rates (5.2 to 9.8 rad/s), immediate event-driven input dispatch, client-side kinematic prediction with anti-snap reconciliation, and adaptive jitter buffering (35-45ms) for remote entities.

## What Changes
- Implement agile dynamic turning model omega(M) scaled by mass.
- Implement event-driven instant input dispatch with monotonic sequence numbers.
- Implement Client-Side Prediction (CSP) with anti-snap error decay in LocalPredictor.
- Implement adaptive jitter buffer (35-45ms) for smooth remote entity interpolation.

## Capabilities

### New Capabilities

### Modified Capabilities
- `physics`: Dynamic agile turn rate scaling with mass.
- `protocol`: Monotonic sequence numbers in input packets.

## Impact
- Frontend input and prediction layers updated (`client/src/input/`, `client/src/net/`).
- Backend physics step and snake model updated (`server/app/game/snake.py`, `server/app/game/engine.py`).
