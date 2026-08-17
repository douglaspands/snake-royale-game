## Context

See proposal.md - Why. This is the first known investigation of server-loop timing on this project; no prior hotfix (v1.5.x-v1.6.1) touched `GameLoop`, `broadcast_snapshot`, or client interpolation/prediction timing constants. The relevant current-state facts that shape the approach:

- `server/app/game/loop.py` runs a naive fixed-`dt` loop: each iteration always calls `engine.step(self.dt)` exactly once and sleeps `max(0, dt - elapsed)`. A tick overrun (`elapsed > dt`) is absorbed by simply running the next iteration immediately with no compensation — simulated time silently falls behind real time.
- `server/app/websocket_handler.py`'s `broadcast_snapshot` awaits each socket's `send_text()` sequentially, so its cost scales linearly with connected player count within the same tick budget.
- `android/app/src/main/python/android_entry.py` runs this loop on a plain daemon thread inside a Chaquopy-embedded CPython interpreter sharing the JVM process with ART/GC/WebView; nothing elevates its scheduling priority. `ServerForegroundService.kt` acquires a `PARTIAL_WAKE_LOCK` with a 10-minute timeout that is never refreshed.
- `client/src/net/interpolator.ts`'s adaptive delay is clamped to 35-65ms and excludes any inter-arrival delta ≥500ms from the jitter statistics that drive that adaptation, so a genuine stall never causes the buffer to grow defensively.
- `client/src/net/local_predictor.ts` hard-snaps (instant teleport) whenever reconciliation drift exceeds 180px, with no distinction between "packet loss/real desync" and "known server stall."
- The project is Spec-Driven: `openspec/specs/protocol/spec.md`, `openspec/specs/android/spec.md` exist; there is no `loop` capability yet, and none of the client-side timing constants above are backed by any spec today.

## Goals / Non-Goals

**Goals:**
- Make the server loop's simulated time track real elapsed time under load, with bounded, non-spiraling catch-up.
- Give the client enough signal and headroom to absorb the resulting (now bounded, but still real) jitter without visible snapping/warping.
- Fix the one confirmed, low-risk Android-side defect (WakeLock timeout).
- Introduce and document a reusable "Loop Engineering" practice, since this class of bug (naive fixed-step loop, no accumulator) is exactly the kind of thing that regresses silently in future changes without a documented checklist.

**Non-Goals:**
- No transport or serialization technology change (stays WebSocket + JSON). The root cause is a pacing/timing bug, not a bandwidth or format bug, so a bigger stack change is not justified by this investigation.
- No Android-specific tick-rate reduction. `REQ-PROTO-004` already permits a 30-40Hz range as a wire contract; picking a different rate for one platform needs its own on-device evidence, which this change does not have.
- No Android thread-priority elevation and no battery-optimization-exemption UX flow. Both are plausible follow-ups but carry their own risk/verification cost (SELinux/cgroup restrictions on the former, Play-policy/UX weight on the latter) disproportionate to what this investigation has confirmed as root cause. Recorded here as explicit follow-ups, not silently dropped.
- No change to the underlying physics/collision model (`REQ-PHYS-*`) — only the loop's timestep *pacing* changes, not what a step computes.

## Decisions

**1. Accumulator with bounded catch-up, not skip-ahead or a variable-dt step.**
Rejected: (a) letting `engine.step` take a variable `dt` each call (`self.dt` scaled by elapsed time) — this makes physics non-deterministic across runs and breaks the "fixed-dt simulation" assumption `REQ-PHYS-*` and the collision/spatial-hash code implicitly rely on; (b) unbounded catch-up — under a sustained stall this spirals (each iteration takes longer than the last, need to catch up more, etc.). Chosen: accumulate real elapsed time (clamped to `MAX_FRAME_TIME = 0.25s` per iteration so one huge stall can't queue unbounded backlog), drain via 0..N calls to `engine.step(self.dt)` at the fixed `dt`, capped at `MAX_CATCHUP_STEPS = 5`; excess backlog past the cap is dropped, not queued. This keeps physics fully deterministic per-step while making the *number* of steps track real time.

**2. Broadcast once per loop iteration, not once per catch-up step.**
If catch-up runs 5 steps in one iteration, clients still get exactly one WORLD_SNAPSHOT for that iteration (the resulting state after all 5 steps), not 5 back-to-back packets. This avoids flooding the client with a burst that would itself look like a distortion, and matches `REQ-PROTO-004`'s "one snapshot per completed tick of loop work" framing at the loop-iteration granularity.

**3. `tickDurationMs` is additive and optional, not a breaking wire change.**
Adding a new field to `WORLD_SNAPSHOT` doesn't require a protocol version bump; existing consumers that ignore unknown fields are unaffected. The client's stall-detection logic treats its presence as an enhancement (skip straight to the flagged-stall path) and falls back to its existing arrival-time-delta heuristic when absent (e.g., during tests that construct packets by hand).

**4. Client widens its clamp and stops discarding stall signal, rather than adopting a wholly different interpolation algorithm.**
Considered a full switch to server-timestamped (not client-arrival-timestamped) interpolation, which would need clock sync (NTP-style offset estimation) between client and server. Rejected as disproportionate: the current arrival-time-based model is already robust to clock drift by construction, and the actual defect is narrower — the ≥500ms exclusion filter and the tight 65ms clamp. Fixing those two parameters plus adding bounded extrapolation on buffer exhaustion closes the gap without a rewrite.

**5. Local predictor's stall flag is a narrow, explicit signal, not inferred.**
`main.ts` computes whether the just-received snapshot followed a flagged stall (using the same signal as the interpolator: `tickDurationMs` if present, else the arrival-time-delta heuristic) and passes a boolean into `reconcileSnapshot`. This keeps `LocalPredictor` a pure function of its inputs (no hidden coupling to `EntityInterpolator` internals) and keeps the "is this a known stall" decision in one place.

**6. WakeLock: switch to indefinite `acquire()`, do not add a periodic-refresh timer.**
`onDestroy()` already reliably releases the lock on stop (confirmed by reading `ServerForegroundService.kt`), so the 10-minute timeout was pure downside with no corresponding safety benefit (it doesn't protect against a leaked lock — the release path is independent of the timeout). Removing the timeout is strictly simpler and lower-risk than adding a periodic refresh.

**7. New `loop` capability instead of folding accumulator requirements into `protocol` or `physics`.**
The accumulator/catch-up/broadcast-concurrency contract is about the loop's own timing discipline, not the wire format (`protocol`) or the physics computation (`physics`). Keeping it as its own capability matches how `harness` is already split out for test-infrastructure concerns, and gives future loop-timing changes (e.g., an eventual Android-specific tick-rate experiment) a clear, single spec home.

## Risks / Trade-offs

- **[Risk] `MAX_CATCHUP_STEPS = 5` and `MAX_FRAME_TIME = 0.25s` are estimates, not measured from real Android hardware.** → Mitigation: these are conservative (5 steps × 33ms = ~165ms of catch-up headroom before backlog is dropped, well inside the client's new 120ms adaptive ceiling once combined with one RTT); the manual on-device verification step in the plan is specifically there to confirm these constants hold up before the change is archived, and both constants are named/central enough in `loop.py` to retune without touching call sites if real-device testing shows otherwise.
- **[Risk] Widening the client's adaptive clamp to 120ms increases perceived input-to-photon latency for remote entities during genuinely jittery conditions.** → Mitigation: the wider bound only engages when jitter/stalls are actually measured (EMA-smoothed, same mechanism as today); normal play on a healthy connection stays near the existing 35-45ms baseline.
- **[Risk] Dropping backlog time past the catch-up cap means a sufficiently long stall is not fully "made up" — the game clock permanently loses that dropped duration relative to wall time.** → Mitigation: this is the correct trade-off (the alternative, unbounded catch-up, is strictly worse — a spiral that never recovers); a dropped few hundred ms once per rare severe stall is preferable to permanent divergence.
- **[Risk] Concurrent broadcast via `asyncio.gather` changes exception handling shape for `send_text` failures.** → Mitigation: use `return_exceptions=True` and keep the existing disconnect-on-failure bookkeeping, now driven by iterating the gathered results instead of catching per-iteration; existing `test_websocket.py` coverage for disconnect-on-send-failure must be extended to the concurrent path, not just trusted to still pass.
- **[Trade-off] This change cannot be fully verified in CI** — the actual trigger condition (Chaquopy/JVM CPU contention) only reproduces on a real Android device. The zero-sleep automated tests verify the loop's and client's *logic* under simulated overrun/stall, which is necessary but not sufficient; the manual on-device check in the plan's Verification section is the acceptance gate for the underlying hypothesis, not just the code.
