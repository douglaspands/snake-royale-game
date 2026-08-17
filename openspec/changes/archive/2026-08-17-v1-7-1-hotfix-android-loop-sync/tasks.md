# Tasks — v1-7-1-hotfix-android-loop-sync

## Execution topology

```
                       ┌──────────────────────────────┐
                       │ Node 0 — orchestrator        │
                       │ spec validation (blocking)   │
                       └──────────────┬───────────────┘
                                      │
        ┌───────────────┬────────────┼────────────┬───────────────┐
        ▼               ▼            ▼            ▼               ▼
 ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
 │ Lane B1     │ │ Lane B2     │ │ Lane F1     │ │ Lane F2     │ │ Lane A1     │
 │ server-loop-│ │ concurrent- │ │ client-     │ │ client-     │ │ android-    │
 │ accumulator │ │ broadcast   │ │ interpolator│ │ predictor-  │ │ wakelock-   │
 │ REQ-LOOP-   │ │ REQ-LOOP-003│ │ -resilience │ │ reconciliat.│ │ indefinite  │
 │ 001/002,    │ │             │ │ REQ-PROTO-  │ │ REQ-PROTO-  │ │ REQ-AND-005 │
 │ REQ-PROTO-  │ │             │ │ 008         │ │ 009         │ │             │
 │ 004         │ │             │ │             │ │             │ │             │
 │ worktree    │ │ worktree    │ │ worktree    │ │ worktree    │ │ worktree    │
 └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
        │               │               │               │               │
        └───────────────┴───────────────┼───────────────┴───────────────┘
                                        ▼   all 5 lanes are file-disjoint — any merge order
                       ┌──────────────────────────────┐
                       │ Node MERGE — orchestrator     │
                       └──────────────┬───────────────┘
                                      ▼
                       ┌──────────────────────────────┐
                       │ Node INT — orchestrator      │
                       │ full quality gate             │
                       └──────────────┬───────────────┘
                                      ▼
                       ┌──────────────────────────────┐
                       │ Node VAL — on-device (user)   │
                       └──────────────┬───────────────┘
                                      ▼
                       ┌──────────────────────────────┐
                       │ Node DOC — orchestrator       │
                       └──────────────────────────────┘
```

Lanes B1, B2, F1, F2 and A1 are launched **together, in one message**, each with `isolation: "worktree"`. No lane may edit a file outside its allowlist below — a lane that needs to cross the boundary stops and reports rather than editing. No lane runs the root `npm test`; that is Node INT's job over the merged tree. Before any lane starts, confirm `git worktree list` and `git log --oneline -1 <branch>` for each spawned worktree actually match the intended base commit (per CLAUDE.md's Graph Engineering guidance) — do not trust the spawn call alone.

---

## 0. Node 0 — Environment & Spec Validation *(orchestrator, blocking)*

- [x] 0.1 Run `npm run spec:validate` and confirm all five delta requirements in this change (`REQ-LOOP-001`, `REQ-LOOP-002`, `REQ-LOOP-003`, `REQ-PROTO-004` modified, `REQ-PROTO-008`, `REQ-PROTO-009`, `REQ-AND-005` modified) are well-formed
- [x] 0.2 Run `openspec validate v1-7-1-hotfix-android-loop-sync` and confirm the change itself is reported valid
- [x] 0.3 Confirm the working tree is clean and record the exact commit each lane worktree will be cut from; verify after spawning that every lane's worktree base matches
- [x] 0.4 Launch lanes B1, B2, F1, F2 and A1 as sub-agents in a single message, each with `isolation: "worktree"`, each carrying: its requirement text, its file allowlist, its denylist, and the lane contract from `design.md`

---

## 1. Lane B1 — Server Loop Accumulator *(subagent `server-loop-accumulator`, owns `REQ-LOOP-001`, `REQ-LOOP-002`, `REQ-PROTO-004`)*

Allowlist: `server/app/game/loop.py`, `server/app/game/engine.py` (only the `create_snapshot` signature/body to add `tick_duration_ms`), `server/tests/test_loop.py`, `server/tests/test_engine.py`. Denylist: everything under `client/`, `android/`, `server/app/websocket_handler.py`.

- [x] B1.1 In `server/app/game/loop.py`, add module-level constants `MAX_FRAME_TIME = 0.25` and `MAX_CATCHUP_STEPS = 5`
- [x] B1.2 Extract the catch-up arithmetic into a small pure function (e.g. `compute_catchup_steps(accumulator: float, dt: float, max_steps: int) -> tuple[int, float]` returning steps to run and the remaining accumulator) so it is testable without asyncio
- [x] B1.3 Rewrite `GameLoop._run_loop()` to track an `accumulator`, add `min(now - last, MAX_FRAME_TIME)` each iteration, drain via 0..N calls to `engine.step(self.dt)` using the pure function from B1.2, and broadcast at most once per loop iteration regardless of how many catch-up steps ran
- [x] B1.4 Pass the real elapsed `frame_time` for that iteration into `engine.create_snapshot(...)` so it can populate `tickDurationMs`
- [x] B1.5 In `server/app/game/engine.py`, add an optional `tick_duration_ms: float | None = None` parameter to `create_snapshot()` and include it in the returned dict as `"tickDurationMs"` only when provided (keep the field additive/optional per design.md Decision 3)
- [x] B1.6 In `server/tests/test_loop.py`, add a scripted-`time.monotonic` test (reusing the existing `FaultyGameEngine`-style mocking pattern) asserting `engine.step` is called exactly `min(floor(gap/dt), MAX_CATCHUP_STEPS)` times for an overrun scenario, and a regression test confirming exactly one `engine.step` call per iteration in the normal (no-overrun) case
- [x] B1.7 In `server/tests/test_engine.py`, add a test asserting `create_snapshot(tick_duration_ms=...)` includes `tickDurationMs` in the payload, and that omitting the argument omits the field
- [x] B1.8 Run `uv run pytest server/tests/test_loop.py server/tests/test_engine.py` inside the lane worktree and report results
- [x] B1.9 Report: exact files changed, test results, and any boundary the lane needed to cross

## 2. Lane B2 — Concurrent Snapshot Broadcast *(subagent `server-broadcast-concurrency`, owns `REQ-LOOP-003`)*

Allowlist: `server/app/websocket_handler.py`, `server/tests/test_websocket.py`. Denylist: `server/app/game/loop.py`, `server/app/game/engine.py`, everything under `client/`, `android/`.

- [x] B2.1 In `ConnectionManager.broadcast_snapshot()`, replace the sequential `for player_id, ws in list(self.active_sockets.items()): await ws.send_text(payload_str)` loop with `asyncio.gather(*(ws.send_text(payload_str) for ws in sockets), return_exceptions=True)`, preserving the existing behavior of disconnecting any socket whose send raised
- [x] B2.2 Keep `disconnect()` calls awaited sequentially after gathering (disconnect bookkeeping does not need to be concurrent, only the sends do)
- [x] B2.3 In `server/tests/test_websocket.py`, extend or add a test with multiple sockets where one raises on `send_text`, asserting the others still receive the payload and only the failing one is disconnected
- [x] B2.4 Run `uv run pytest server/tests/test_websocket.py` inside the lane worktree and report results
- [x] B2.5 Report: exact files changed, test results, and any boundary the lane needed to cross

## 3. Lane F1 — Client Interpolator Resilience *(subagent `client-interpolator-resilience`, owns `REQ-PROTO-008`)*

Allowlist: `client/src/net/interpolator.ts`, `client/tests/harness/packet_generator.ts` (only a new stall-injection helper), interpolator test files under `client/tests/`. Denylist: `client/src/net/local_predictor.ts`, `client/src/main.ts`, everything under `server/`, `android/`.

- [x] F1.1 In `pushSnapshot()`, stop excluding deltas `>= 500`; instead clamp any delta to `Math.min(delta, 500)` before pushing into `_deltaHistory`
- [x] F1.2 In `_recomputeAdaptiveDelay()`, widen the clamp bounds from `[35, 65]` to `[35, 120]`
- [x] F1.3 Add a `STALL_THRESHOLD_MS = 200` constant and stall-cooldown logic: when a raw inter-arrival delta (or an incoming `tickDurationMs` on the pushed snapshot, once present) exceeds the threshold, set `interpolationDelayMs` directly to 120 (bypassing the EMA glide) and suppress normal EMA recomputation for the next few pushes before resuming
- [x] F1.4 In `getInterpolatedState()`, when `renderTime >= bNewest.clientArrivalMs`, extrapolate the affected entities from the last known velocity (derived from the two newest buffered snapshots) up to a bounded `MAX_EXTRAPOLATION_MS = 100`; beyond that bound, keep the existing freeze-on-newest-frame fallback
- [x] F1.5 Extend `client/tests/harness/packet_generator.ts` with a stall+burst injection helper (e.g. `injectStall(durationMs)` followed by resuming normal-interval snapshots)
- [x] F1.6 Add tests covering: a stall widens the adaptive delay instead of being invisible to it; brief buffer exhaustion produces extrapolated motion instead of an immediate freeze; a post-stall burst does not produce a single-frame jump exceeding a defined max px/ms bound
- [x] F1.7 Run `cd client && npm test` inside the lane worktree and report coverage results
- [x] F1.8 Report: exact files changed, test results, and any boundary the lane needed to cross

## 4. Lane F2 — Client Predictor Reconciliation *(subagent `client-predictor-reconciliation`, owns `REQ-PROTO-009`)*

Allowlist: `client/src/net/local_predictor.ts`, and only the narrow stall-flag pass-through in `client/src/main.ts`'s `onSnapshot` handler (computing whether the just-received snapshot followed a flagged stall, and passing it into `reconcileSnapshot`). Denylist: `client/src/net/interpolator.ts`, any other part of `client/src/main.ts`, everything under `server/`, `android/`.

- [x] F2.1 Change `reconcileSnapshot(serverSnake: InterpolatedSnake)` to `reconcileSnapshot(serverSnake: InterpolatedSnake, followedKnownStall: boolean = false)`
- [x] F2.2 When `drift > 180.0` and `followedKnownStall` is `true`, apply a fast eased correction (λ≈40 over a short bounded duration, mirroring the existing `errorDecayRate` mechanism rather than introducing a new one) instead of the instant hard-snap; when `followedKnownStall` is `false`, keep today's instant hard-snap unchanged
- [x] F2.3 In `client/src/main.ts`'s `onSnapshot` handler, compute the same stall signal used by the interpolator (prefer `tickDurationMs` when present on the snapshot, else the arrival-time-delta heuristic) and pass it as the new `reconcileSnapshot` argument — this wiring must stay a narrow read of already-available data, not a new dependency on `EntityInterpolator` internals
- [x] F2.4 Add tests asserting: unflagged large drift still hard-snaps exactly as before (regression), and flagged-stall large drift takes the eased path instead
- [x] F2.5 Run `cd client && npm test` inside the lane worktree and report coverage results
- [x] F2.6 Report: exact files changed, test results, and any boundary the lane needed to cross

## 5. Lane A1 — Android WakeLock Indefinite Hold *(subagent `android-wakelock-indefinite`, owns `REQ-AND-005`)*

Allowlist: `android/app/src/main/java/com/snakeroyale/host/ServerForegroundService.kt`. Denylist: everything else.

- [x] A1.1 In `acquireLocks()`, change `wakeLock?.acquire(10 * 60 * 1000L /* 10 minutes timeout refresh */)` to an indefinite `wakeLock?.acquire()`, updating the inline comment to explain why (per design.md Decision 6: `onDestroy()` already reliably releases it on stop)
- [x] A1.2 Confirm by inspection that `onDestroy()` (or the existing release path) still releases the WakeLock unconditionally on service stop — no change expected here, verify only
- [x] A1.3 Report: exact diff, and confirm (as prior Android-lane work in this repo has had to) whether the change was compiled locally or only verifiable via CI, given no Gradle wrapper/`ANDROID_HOME` may be available in the worktree
- [x] A1.4 On-device validation (Node VAL, task 8.2) surfaced a second `REQ-AND-005` defect: `WifiLock` acquired with `WIFI_MODE_FULL_HIGH_PERF`, which is a documented no-op on API 29+, letting the Wi-Fi radio enter power-save and making the embedded server unreachable from other devices on the network (host device unaffected, since it talks to the server via `localhost`/loopback, not the Wi-Fi radio)
- [x] A1.5 In `acquireLocks()`, switch the `WifiLock` mode to `WIFI_MODE_FULL_LOW_LATENCY` on `Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q`, keeping `WIFI_MODE_FULL_HIGH_PERF` below that (minSdk 24); extract the SDK-conditioned choice into a small pure/testable function (`resolveWifiLockMode(sdkInt: Int): Int`)
- [x] A1.6 Report: exact diff, and confirm whether compiled locally or only verifiable via CI (same constraint as A1.3)

## 5b. Android Test Infrastructure *(owns `REQ-AND-011`, added after Node VAL surfaced there were no Android tests or CI job at all)*

Files: `android/app/build.gradle.kts` (test deps), `android/app/src/test/java/com/snakeroyale/host/*.kt` (new unit tests), `android/app/src/androidTest/java/com/snakeroyale/host/*.kt` (new instrumented tests), `.github/workflows/ci.yml` (new jobs).

- [x] 5b.1 Add `testImplementation("junit:junit:4.13.2")`; extract `NetworkHelper.selectLocalIpAddresses(candidates)` and `NetworkHelper.buildServerUrl(ips, port)` as pure functions out of `getLocalIpAddresses()`/`getPrimaryServerUrl()` so the IP filter/priority logic and URL formatting are unit-testable without a real `NetworkInterface`
- [x] 5b.2 Add `NetworkHelperTest.kt`, `QRCodeHelperTest.kt` (tests `isReachableByPeers`), and `ServerForegroundServiceWifiLockModeTest.kt` (regression test for A1.5: SDK 28 → `WIFI_MODE_FULL_HIGH_PERF`, SDK 29/34 → `WIFI_MODE_FULL_LOW_LATENCY`) under `android/app/src/test/java/com/snakeroyale/host/`
- [x] 5b.3 Add `androidTestImplementation` deps: `androidx.test.ext:junit:1.3.0`, `androidx.test.espresso:espresso-core:3.7.0`, `androidx.test:runner:1.7.0`, `androidx.test:rules:1.7.0`, `com.google.zxing:core:3.5.3` (versions checked against Google Maven metadata at implementation time)
- [x] 5b.4 Add `QRCodeHelperInstrumentedTest.kt` (QR encode/decode round-trip via ZXing on-device — regression guard for the v1.6.0 undecodable-QR bug, REQ-AND-002), `MainActivityInstrumentedTest.kt` (dashboard views visible via `ActivityScenario`+Espresso), `ServerForegroundServiceInstrumentedTest.kt` (starts the real service, polls `/health` via both `localhost` and the LAN IP from `NetworkHelper` — closest automated guard for the A1.4/A1.5 bug class) under `android/app/src/androidTest/java/com/snakeroyale/host/`
- [x] 5b.5 Add `android-unit-test` (`gradle testDebugUnitTest`, no emulator) and `android-instrumented-test` (`reactivecircus/android-emulator-runner@v2`, API 34 `google_apis`/`x86_64`, `gradle connectedDebugAndroidTest`) jobs to `.github/workflows/ci.yml`, mirroring `release.yml`'s JDK/Android SDK/Gradle setup and asset-sync steps
- [x] 5b.6 Report: files changed, and confirm whether the new jobs were exercised (this environment has no `gradlew`/`ANDROID_HOME`, so real verification is CI-only, same constraint as A1.3/A1.6)

---

## 6. Node MERGE — Lane Integration *(orchestrator)*

- [x] 6.1 Confirm all five lanes' diffs are file-disjoint (no two lanes touched the same file) by diffing each lane's worktree against its stated allowlist
- [x] 6.2 Merge all five lanes' patches onto the working branch — no forced order required since they are file-disjoint; if `client/src/main.ts` shows overlapping hunks from F1/F2 wiring, resolve by keeping F1's scope to `interpolator.ts`-adjacent code only and F2's scope to the `onSnapshot` stall-flag line only
- [x] 6.3 Review each lane's report for out-of-allowlist edits and reject any that crossed the boundary without reporting — verify per lane with `git status`/`git diff` inside each worktree rather than trusting the reports alone

## 7. Node INT — Quality Gates *(orchestrator, merged tree)*

- [x] 7.1 Run `uv run pytest` (backend) and confirm ≥80% coverage
- [x] 7.2 Run `cd client && npm test` (frontend, vitest) and confirm ≥80% coverage
- [x] 7.3 Run `npm test` (root gate: pytest + vitest + openspec validate)
- [x] 7.4 Run `npm run lint` (`ruff check` + `ruff format --check` + `ty check`) — zero errors
- [x] 7.5 Run `npm run android:sync-client` so the APK assets carry the rebuilt client bundle with the F1/F2 fixes
- [x] 7.6 Manually verify with `npm run dev`: play a match locally, and specifically simulate a server stall (e.g. temporarily insert an artificial sleep in a debug build, or use the new stall-injection test harness against a live connection) to confirm no visible freeze-then-warp and no local-snake hard-snap when a stall is flagged
- [x] 7.7 Bump version identity (`openspec/config.yaml`, `package.json`, `pyproject.toml`, `README.md`, and Android `versionCode`/`versionName`) to `1.7.1`

## 8. Node VAL — On-Device Validation *(requires the physical device — user-executed)*

- [ ] 8.1 Install the updated build on the Android device used to originally observe the distortions
- [ ] 8.2 Play a multi-minute match (players + food present) on the embedded Android server and confirm the previously-reported snapping/warping is no longer visible
- [ ] 8.3 Continue the session past the 10-minute mark specifically, to validate the WakeLock fix (`REQ-AND-005`) — confirm no throttling-related degradation appears after that point
- [ ] 8.4 If distortions are still observed, capture whether they correlate with a `tickDurationMs` spike (add temporary logging if needed) to determine whether `MAX_CATCHUP_STEPS`/`MAX_FRAME_TIME` need retuning (see design.md Risk 1) before closing this change

## 9. Node DOC — Spec Sync, Loop Engineering Docs & Archive *(orchestrator)*

- [x] 9.1 Run `/opsx-sync` to merge the `loop` capability (new), and the modified `REQ-PROTO-004`/added `REQ-PROTO-008`/`REQ-PROTO-009`, and modified `REQ-AND-005` into their respective main specs
- [x] 9.2 Run `npm run spec:doctor` and confirm no orphaned or duplicated requirement identifiers
- [x] 9.3 Write `docs/LOOP_ENGINEERING.md` covering: the accumulator/catch-up contract, why `MAX_FRAME_TIME`/`MAX_CATCHUP_STEPS` exist, this bug as the worked example, and a pre-flight checklist for future timestep-touching changes
- [x] 9.4 Add a new `## 🔁 Loop Engineering` section to `CLAUDE.md`, placed immediately after `## 🧩 Execução paralela com sub-agentes`, pointing at `docs/LOOP_ENGINEERING.md` and at this change as the living reference
- [ ] 9.5 **Gated — requires explicit user request after evaluation, never auto-run.** Archive as `openspec/changes/archive/AAAA-MM-DD-v1-7-1-hotfix-android-loop-sync/`
- [ ] 9.6 **Gated — requires explicit user request after evaluation, never auto-run.** Tag and publish release `v1.7.1`, then verify the published asset and its checksum
