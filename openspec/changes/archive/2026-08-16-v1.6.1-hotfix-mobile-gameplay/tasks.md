# Tasks — v1.6.1-hotfix-mobile-gameplay

## Execution topology

```
                       ┌──────────────────────────────┐
                       │ Node 0 — orchestrator        │
                       │ spec validation (blocking)   │
                       └──────────────┬───────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
   ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
   │ Lane A  (subagent) │  │ Lane B  (subagent) │  │ Lane C  (subagent) │
   │ android-webview-   │  │ client-input-      │  │ client-viewport-   │
   │ viewport           │  │ source             │  │ sizing             │
   │ REQ-AND-004        │  │ REQ-PROTO-007      │  │ REQ-REND-005       │
   │ worktree           │  │ worktree           │  │ worktree           │
   └─────────┬──────────┘  └─────────┬──────────┘  └─────────┬──────────┘
             │                       │                       │
             └───────────────────────┼───────────────────────┘
                                     ▼   merge order: B → C → A
                       ┌──────────────────────────────┐
                       │ Node INT — orchestrator      │
                       │ full quality gate            │
                       └──────────────┬───────────────┘
                                      ▼
                       ┌──────────────────────────────┐
                       │ Node VAL — on-device (user)  │
                       └──────────────┬───────────────┘
                                      ▼
                       ┌──────────────────────────────┐
                       │ Node DOC — orchestrator      │
                       └──────────────────────────────┘
```

Lanes A, B and C are launched **together, in one message**, each with `isolation: "worktree"`. No lane may edit a file outside its allowlist in `design.md` § Parallel execution — a lane that needs to cross the boundary stops and reports. No lane runs the root `npm test`; that is Node INT's job over the merged tree.

---

## 0. Node 0 — Environment & Spec Validation *(orchestrator, blocking)*

- [x] 0.1 Run `npm run spec:validate` and confirm the three delta specs of this change (`REQ-PROTO-007`, `REQ-AND-004`, `REQ-REND-005`) are well-formed before any lane starts — 7/7 specs passed; `openspec validate v1.6.1-hotfix-mobile-gameplay` reports the change valid
- [x] 0.2 Confirm the working tree is clean and the branch is cut from the tip that contains `v1.6.0` — HEAD at `89aa19d` (the v1.6.0 commit); the only uncommitted paths are this change's own docs and `CLAUDE.md`
  - ⚠️ **This check was insufficient and a lane caught what it missed.** It verified the *orchestrator's* HEAD but never the base the lane worktrees would be cut from. All three worktrees were actually created from `a81dbb4` (the 1.5.3 merge), missing the v1.5.4/v1.5.5/v1.6.0 commits. Impact was confined to lane A: `git diff --stat a81dbb4 89aa19d -- client/` is empty, so lanes B and C had a byte-identical source tree. **Future runs must verify the worktree base itself, not just the orchestrator's HEAD**, before allowing lanes to start.
- [x] 0.3 Launch lanes A, B and C as sub-agents in a single message, each with `isolation: "worktree"`, each carrying: its requirement text, its file allowlist, its denylist, and the lane contract from `design.md`

---

## 1. Lane A — Android WebView Viewport *(subagent `android-webview-viewport`, owns `REQ-AND-004`)*

Allowlist: `android/app/src/main/java/com/snakeroyale/host/GameWebViewActivity.kt`, `android/app/build.gradle.kts`. Denylist: everything under `client/`, `server/`.

- [x] A.1 In `GameWebViewActivity.setupWebView()`, set `useWideViewPort = false` and `loadWithOverviewMode = false`, replacing the current `true`/`true` pair, with a comment citing `REQ-AND-004` and the fact that the SPA declares its own `width=device-width` viewport
- [x] A.2 Confirm by inspection that `setInitialScale` is never called with a non-zero value anywhere in the activity, so page scale is left to the viewport meta tag — `grep` returns no matches anywhere in the file; page scale is left entirely to the viewport meta tag, and no call was added
- [x] A.3 Confirm the remaining WebView settings are unchanged — `setSupportZoom(false)`, `displayZoomControls = false`, `LAYER_TYPE_HARDWARE`, `javaScriptEnabled`, `domStorageEnabled` — and that `hideSystemUI()` still runs from `onCreate`, `onConfigurationChanged` and `onWindowFocusChanged` — all verified untouched, including `cacheMode`, `databaseEnabled`, `mediaPlaybackRequiresUserGesture` and `SCREEN_ORIENTATION_FULL_SENSOR`
- [x] A.4 Bump `versionCode = 7` and `versionName = "1.6.1"` in `android/app/build.gradle.kts`
- [x] A.5 Report: the exact diff, plus an explicit statement that the Kotlin change was **not** compiled locally — there is no Gradle wrapper in `android/` and `ANDROID_HOME` is unset, so compilation is confirmed only by the CI dry-run in `VAL.1`
  - Lane A detected the wrong worktree base (see 0.2), and — with `git merge` blocked by the permission classifier — recovered by reading its two allowlisted files from `feature/1.6.0-scannable-qr-and-orientation` with read-only `git show` and rewriting them with its edits applied. **Orchestrator verification:** `git diff 89aa19d` inside the lane worktree returns exactly the two intended hunks and nothing else, and `git status` shows only those two files modified. No drift.

## 2. Lane B — Client Input Source Isolation *(subagent `client-input-source`, owns `REQ-PROTO-007`)*

Allowlist: `client/src/input/desktop_controller.ts`, `client/tests/input.test.ts`, and only `_setupInputListeners()` / `_sendCurrentInput()` / the input-related private fields in `client/src/main.ts`. Denylist: `client/src/index.css`, `_setupResize()`, everything under `android/`, `server/`.

- [x] B.1 In `client/src/input/desktop_controller.ts`, change the internal mouse-aim listener from `window.addEventListener('mousemove', ...)` to `window.addEventListener('pointermove', ...)`, gated on `!this._useKeyboard && e.pointerType === 'mouse'`
  - **Deviation, accepted:** the `!this._useKeyboard` half of the gate could not be kept. `_useKeyboard` was only ever *cleared* inside `setMousePosition()`; with that method deleted (B.3) the flag would latch permanently, killing mouse aim for the rest of the session after a single WASD press, and leaving it write-only fails `tsc` (`TS6133`). The lane removed the field. **Orchestrator verification:** this reproduces the *effective* pre-fix behaviour exactly — `main.ts`'s listener was registered after `DesktopController._bindEvents()` and called `setMousePosition()`, which set `_useKeyboard = false` unconditionally, so the gate never actually blocked anything and a mouse move always beat the keyboard. `REQ-PROTO-007` mandates only the `pointerType === 'mouse'` check, which is fully implemented.
- [x] B.2 In `client/src/main.ts`, delete the duplicate `window.addEventListener('mousemove', ...)` block in `_setupInputListeners()` — the joystick's own `pointermove`/`pointerup`/`pointercancel` listeners left untouched
- [x] B.3 Remove `DesktopController.setMousePosition()` now that its only caller is gone; keep equivalent behavioural coverage via the new `pointermove` path rather than deleting the assertions outright
- [x] B.4 In `client/src/main.ts`, add a private field tracking which controller (`'desktop' | 'joystick'`) last fired `onInputChange`, updated inside the `_desktopController.onInputChange` and `_virtualJoystick.onInputChange` callbacks — `_activeInputSource`
- [x] B.5 Rewrite `_sendCurrentInput()` to read the angle and boost from whichever source is currently tracked as last-active, instead of branching on `virtualJoystick.isActive()` — angle only; the boost OR (`desktop.isBoost()` then `if (joystick.isBoost()) boost = true`) is preserved verbatim so the double-tap & hold turbo keeps working. The lane added a module-level `export type InputSource` and a pure `export function resolveInputAngle()` as a testable seam, since `main.ts` exports no other surface and is excluded from coverage
- [x] B.6 In `client/tests/input.test.ts`, update the mouse-move simulation to dispatch `pointermove` with `pointerType: 'mouse'`
- [x] B.7 Add tests covering the three `REQ-PROTO-007` scenarios — new `client/tests/input_source.test.ts` drives real `DesktopController` + `VirtualJoystick` through a harness mirroring `_setupInputListeners`' wiring; `input.test.ts` gained the scenario-1 test plus a regression test that a genuine mouse move still overrides a keyboard heading
- [x] B.8 Run `cd client && npm test` inside the lane worktree and report the result — 9 files, 40 tests passing; 88.65% stmts / 76.72% branches / 89.88% funcs. `desktop_controller.ts` at 100% lines. `npx tsc --noEmit` clean
- [x] B.9 Report: exact files changed, test results, and any boundary the lane needed to cross — no boundary crossed; `_setupResize()` and the `Camera` construction byte-identical, verified by the orchestrator against the lane diff

## 3. Lane C — Client Viewport Sizing *(subagent `client-viewport-sizing`, owns `REQ-REND-005`)*

Allowlist: `client/src/index.css`, and only `_setupResize()` / the `Camera` construction in `client/src/main.ts`, plus `client/tests/` files covering resize and camera. Denylist: `client/src/input/`, `_setupInputListeners()`, `_sendCurrentInput()`, everything under `android/`, `server/`.

- [x] C.1 In `client/src/index.css`, change `#app` from `width: 100vw; height: 100vh` to `width: 100%; height: 100%`, resolving against the already-`100%` `html, body`
- [x] C.2 Audit the rest of `client/src/index.css` for any other `vw`/`vh` unit that can produce overflow, and report findings before changing anything beyond `#app` — `#app` was the **only** `vw`/`vh` usage in the file; nothing else changed. `#game-canvas`, `.ui-overlay`/`.ui-modal` (`inset: 0`), `.lobby-card`/`.modal-card` (`90%`, `max-width: 440px`) and `.mobile-turbo-btn` (absolute, fixed 76px) were all cleared as bounded by `#app` without editing
- [x] C.3 In `_setupResize()` in `client/src/main.ts`, measure `document.documentElement.clientWidth` / `clientHeight` instead of `window.innerWidth` / `innerHeight`, keeping the existing `devicePixelRatio` backing-store scaling untouched — dpr scaling byte-identical
- [x] C.4 Apply the same layout-viewport measurement to the initial `Camera` construction in the constructor, so the first frame and the first `resize` agree
- [x] C.5 Add tests covering the two `REQ-REND-005` scenarios — new `client/tests/viewport.test.ts`, 5 tests, reusing the REQ-HARN-004 harness (`MockCanvasElement`, `MockAnimationClock`); no timers, resize driven by a synthetic `resize` event. Mutation-checked: reverting both production edits fails 4 of the 5
- [x] C.6 Run `cd client && npm test` inside the lane worktree and report the result — 9 files, 39 tests, all passing; coverage 93.43% stmts / 77.04% branches / 93.33% funcs / 93.43% lines, above the 80/70/80/80 gates. `npx tsc --noEmit` clean
- [x] C.7 Report: exact files changed, the `vw`/`vh` audit result from C.2, test results, and any boundary the lane needed to cross — no boundary crossed; `_setupInputListeners()`, `_sendCurrentInput()` and `client/src/input/` untouched, verified by the orchestrator against the lane diff
  - Lane note: the worktree had no `client/node_modules`; the lane symlinked the main checkout's to run vitest and removed it afterwards. Node INT runs in the main checkout, which has its own.
  - Lane note: the lane reported it could not write the `REQ-REND-005` delta spec because `openspec/` is denylisted for it. Not an outstanding item — the orchestrator authored `specs/rendering/spec.md` before Node 0; the lane simply could not see it, since it is uncommitted.

---

## 4. Node MERGE — Lane Integration *(orchestrator)*

- [x] 4.1 Merge lane B first — it deletes a block from `_setupInputListeners()` and shifts the line numbers lane C's hunks anchor to — applied with `git apply --3way`, clean
- [x] 4.2 Merge lane C onto the result, resolving `client/src/main.ts` by method boundary (B owns the input methods, C owns `_setupResize` and the `Camera` construction) — clean, **zero conflicts**; the method-boundary split held exactly as designed
- [x] 4.3 Merge lane A — disjoint from both, no conflict expected — clean. Lane A's patch had to be scoped to its two allowlisted files: diffing all of `android/app` from its (wrong, see 0.2) worktree base would have reverted the v1.5.4/v1.5.5/v1.6.0 Android work in the other files
- [x] 4.4 Review each lane's report for out-of-allowlist edits and reject any that crossed the boundary without reporting — all three clean. Verified per lane with `git status` and `git diff` inside each worktree rather than trusting the reports: lane A touched only its two files, lane B left `_setupResize`/`Camera` byte-identical, lane C left `_setupInputListeners`/`_sendCurrentInput`/`src/input/` byte-identical
  - The two new test files were untracked in their worktrees, so they were copied across separately rather than carried by the patches.

## 5. Node INT — Quality Gates *(orchestrator, merged tree)*

- [x] 5.1 Run `cd client && npm test` (vitest, ≥80% coverage) — 10 files, 45 tests passing; 93.52% stmts / 77.55% branches / 93.25% funcs / 93.52% lines
- [x] 5.2 Run `npm test` (root gate: pytest + vitest + openspec validate) — 47 pytest passed, 45 vitest passed, 7/7 specs valid
- [x] 5.3 Run `npm run lint` (`ruff check` + `ruff format --check` + `ty check`) — all checks passed, 32 files already formatted
- [x] 5.4 Run `npm run android:sync-client` so the APK assets carry the rebuilt client bundle with the lane B and C fixes — new bundle `index-DDbdtsrR.js` / `index-CVj7B72O.css` in place and referenced by the copied `index.html`; verified the compiled JS contains both `pointerType!=="mouse"` and `documentElement.clientWidth`
  - ⚠️ **Stale-asset finding, not fixed:** the script is `cp -r dist/* …/client_dist/` with no prune, so the previous release's `index-zn7FLEeE.js` / `index-D0PuLDD6.css` are still sitting in `android/app/src/main/assets/client_dist/assets/` and would ship inside the APK. Harmless to correctness — `index.html` points at the new hashes — but it is dead weight that grows every release, and it is exactly the hazard `v1.5.5` task 8.7 was written to catch. Fix belongs in the sync script (`rm -rf` the target before copying), which is outside this change's specs.
- [x] 5.5 Update the version identity in `openspec/config.yaml`, `package.json` and `README.md` to `1.6.1`, matching lane A's `versionCode`/`versionName` — `pyproject.toml` bumped too (it carries the same string and moved in the v1.6.0 release commit)
- [x] 5.6 Manually verify with `npm run dev` and browser touch emulation: drag the joystick, release it, and confirm the snake continues straight in the last commanded direction; separately confirm mouse-aim still works and the canvas still fills the window on desktop — user-confirmed, 2026-08-16
  - Unrelated observation while checking: `/health` reports `"version":"1.0.0-VIPER"`, a hardcoded string in the server that has not tracked any release since. Cosmetic, out of scope, worth its own cleanup — tracked as v1.6.3 `REQ-AND-003`.

## 6. Node VAL — On-Device Validation *(requires the physical device — user-executed)*

- [x] 6.1 Dry-run the release workflow and download the signed APK artifact — user-confirmed, 2026-08-16
- [x] 6.2 Install over 1.6.0 on the Samsung Galaxy S20 FE and confirm the in-place update succeeds — user-confirmed on-device, 2026-08-16
- [x] 6.3 Launch "Jogar no App" and confirm the game fills the display edge to edge with no surrounding margin, in both portrait and landscape — user-confirmed on-device, 2026-08-16
- [x] 6.4 Capture the evidence that closes the diagnosis: from the WebView, log `window.devicePixelRatio`, `window.visualViewport.scale`, `document.documentElement.clientWidth/clientHeight` and `window.innerWidth/innerHeight`, and confirm scale is `1` and the two viewport measurements agree — user-confirmed on-device, 2026-08-16
- [x] 6.5 Steer with the joystick in the in-app WebView, release it, and confirm the snake holds its heading instead of drifting downward — user-confirmed on-device, 2026-08-16
- [x] 6.6 Repeat 6.5 in the system browser on the same device to confirm the fix is in the client, not the WebView host — user-confirmed on-device, 2026-08-16
- [x] 6.7 Rotate during an active match and confirm the session survives — no reload, no disconnect, canvas resized, still no margin — user-confirmed on-device, 2026-08-16
- [x] 6.8 If 6.3 still shows a margin, capture `adb shell dumpsys window | grep -A5 GameWebViewActivity` and the screenshot, and reopen the diagnosis against the design's stated risk before applying further changes — not needed, no margin observed

## 7. Node DOC — Spec Sync & Archive *(orchestrator)*

- [x] 7.1 Sync `v1.6.0-scannable-qr-and-orientation` first if it is still unsynced — this change's `REQ-AND-004` delta builds on its text, and syncing out of order would drop the orientation clauses — synced v1.5.4, v1.5.5 and v1.6.0 into `openspec/specs/android/spec.md` before this change, in dependency order
- [x] 7.2 Run `/opsx-sync` to merge `REQ-PROTO-007` into `openspec/specs/protocol/spec.md`, `REQ-REND-005` into `openspec/specs/rendering/spec.md`, and the modified `REQ-AND-004` into `openspec/specs/android/spec.md` — done; `openspec validate --specs --no-interactive` reports 7/7 passed
- [x] 7.3 Run `npm run spec:doctor` and confirm no orphaned or duplicated requirement identifiers — clean, no orphaned references
- [x] 7.4 Archive as `openspec/changes/archive/AAAA-MM-DD-v1.6.1-hotfix-mobile-gameplay/` — archived to `openspec/changes/archive/2026-08-16-v1.6.1-hotfix-mobile-gameplay/`, alongside v1.5.4, v1.5.5 and v1.6.0 archived the same day, since none of the four shipped a standalone tag before this branch unified them
- [ ] 7.5 Tag and publish release `v1.6.1`, then verify the published asset and its checksum

---

## 8. Follow-ups surfaced during implementation *(not in this change's scope)*

All five are now registered as SDD artifacts, so they survive this change's archival:

| # | Registered as |
| :--- | :--- |
| 8.1 | `openspec/changes/v1.6.2-hotfix-touch-boost-isolation/` — `REQ-PROTO-008` |
| 8.2 | `openspec/changes/v1.6.3-hotfix-release-packaging-hygiene/` — `REQ-AND-003` (modified) |
| 8.3 | `openspec/changes/v1.6.3-hotfix-release-packaging-hygiene/` — `REQ-AND-009` |
| 8.4 | `openspec/changes/v1.6.3-hotfix-release-packaging-hygiene/` — Node B3 (no spec: `.gitignore` hygiene, no capability) |
| 8.5 | `CLAUDE.md` § Execução paralela com sub-agentes (no spec: agent-tooling behaviour, no repository-level fix) |

- [ ] 8.1 **Touch-synthesized boost contamination.** `DesktopController._bindEvents()` still binds `mousedown`/`mouseup` to set `_boost` on `e.button === 0`. Browsers fire compatibility mouse events after touch that is not `preventDefault()`ed, and `button` is `0` for a primary touch, so touch can set `_boost = true` — which `_sendCurrentInput()`'s OR then forwards as turbo. This is the same contamination family as `REQ-PROTO-007` but governs boost, not heading, so it was deliberately left untouched. Suggested fix shape: give the boost listeners the same `pointerdown`/`pointerup` + `pointerType === 'mouse'` treatment. **Severity unverified:** lane B assessed it as "every joystick drag transmits turbo, draining mass"; that is plausible but was not reproduced on a device, and compatibility mouse events are commonly suppressed during a drag and fire only at the end of a tap — in which case the real effect is a brief turbo blip per tap, not continuous boost. Measure on the device before choosing the requirement's wording.
- [ ] 8.2 **`android:sync-client` leaves stale bundles.** See 5.4. The script copies without pruning, so every superseded hashed asset accumulates in `android/app/src/main/assets/client_dist/assets/` and ships in the APK.
- [ ] 8.3 **`/health` reports a hardcoded `1.0.0-VIPER`.** The endpoint's version string has not tracked a release since v1.0.0.
- [ ] 8.4 **`.claude/worktrees/` is not ignored by git.** Parallel-lane runs leave worktrees that show up as untracked noise in `git status`. Add the path to `.gitignore`.
- [ ] 8.5 **Lane worktrees are cut from an older base than the orchestrator's HEAD.** See 0.2. Until that is understood, Node 0 of every parallel change must verify the worktree base explicitly.
