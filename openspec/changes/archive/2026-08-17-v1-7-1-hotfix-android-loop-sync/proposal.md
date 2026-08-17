## Why

Players report visible "distortions" in snake bodies/movement — snapping, warping, stutter — specifically when the server runs embedded on Android via Chaquopy, not when hosted standalone (desktop/browser). Investigation traced this to a naive fixed-timestep server loop with no catch-up/accumulator, a sequential (non-concurrent) per-socket broadcast, and a client interpolation/prediction pipeline with too little headroom for the resulting jitter — conditions that are latent on desktop but are regularly triggered on Android where the embedded Python interpreter shares CPU with the JVM/ART runtime, GC pauses, and WebView scheduling. A confirmed Android-side defect (an un-refreshed 10-minute WakeLock) compounds the problem in longer sessions. This must be fixed now because it is the primary quality gap blocking a good Android experience, and no prior hotfix has ever addressed server-loop timing.

## What Changes

- Replace the server's naive fixed-`dt` game loop with a bounded fixed-timestep accumulator (catch-up capped to avoid a spiral-of-death), and make snapshot broadcast concurrent instead of sequential per socket.
- Add an optional `tickDurationMs` field to the `WORLD_SNAPSHOT` packet so clients can distinguish a genuine server-side stall from ordinary network jitter.
- Widen and harden the client's adaptive interpolation buffer (`EntityInterpolator`) so a stall is detected and compensated for instead of being invisible to its jitter statistics, and add bounded extrapolation instead of a hard freeze when the render clock outruns the buffer.
- Add a "known stall" reconciliation path to `LocalPredictor` so a large drift caused by a flagged server stall is corrected with a fast eased catch-up instead of an instant teleport; unflagged large drift (packet loss, real desync) keeps today's instant hard-snap.
- Fix the Android `ForegroundService` WakeLock to be held for the entire server session instead of expiring silently after an un-refreshed 10-minute timeout.
- Introduce and document a new "Loop Engineering" practice (parallel to the project's existing documented "Graph Engineering" practice) covering the fixed-timestep accumulator/catch-up contract, so future timestep-touching changes have a checklist and a worked example to follow.
- **BREAKING**: none. All wire/packet changes are additive (new optional field); all threshold/behavior changes are internal tuning, not public contract removals.

## Capabilities

### New Capabilities
- `loop`: Server-authoritative game loop timing contract — fixed-timestep accumulation, bounded catch-up (spiral-of-death protection), and concurrent per-tick snapshot broadcast.

### Modified Capabilities
- `protocol`: `REQ-PROTO-004` (World Snapshot Broadcast) gains the `tickDurationMs` field and an explicit jitter/variance expectation on broadcast cadence. New requirements are added for the client's adaptive interpolation buffer contract and the local-prediction reconciliation contract, both of which currently exist only as undocumented magic numbers in code.
- `android`: `REQ-AND-005` (Background Power and Network Lock Retention) is tightened to require the WakeLock be held for the entire server session with no silent timeout-driven expiry.

## Impact

- **Affected code**: `server/app/game/loop.py`, `server/app/game/engine.py` (snapshot signature), `server/app/websocket_handler.py`, `client/src/net/interpolator.ts`, `client/src/net/local_predictor.ts`, `client/src/main.ts` (narrow stall-flag wiring), `android/app/src/main/java/com/snakeroyale/host/ServerForegroundService.kt`.
- **Affected specs**: `openspec/specs/protocol/spec.md`, `openspec/specs/android/spec.md`, new `openspec/specs/loop/spec.md`.
- **Affected docs**: new `docs/LOOP_ENGINEERING.md`; new "Loop Engineering" section in `CLAUDE.md`.
- **Tests**: `server/tests/test_loop.py`, `server/tests/test_engine.py`, `server/tests/test_websocket.py`, client interpolator/predictor tests, `client/tests/harness/packet_generator.ts` (stall-injection helper) — all zero-sleep / virtual-clock driven per the project's test harness discipline.
- **No dependency or transport changes**: stays on WebSocket + JSON; no new packages; tick rate stays at 30 Hz (unchanged, already within the existing 30-40 Hz protocol contract).
- **Explicitly out of scope for this change**: Android thread-priority elevation and a battery-optimization-exemption UX flow — recorded as follow-ups in design.md if the fixes above prove insufficient on real hardware.
