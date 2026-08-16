# Tasks — v1.6.2-hotfix-touch-boost-isolation

Sequential, single session. See `design.md` D4 — this change edits lines adjacent to `v1.6.1`'s and **must not** be implemented in parallel with it.

## 0. Node 0 — Environment, Spec Validation & Measurement

- [ ] 0.1 Confirm `v1.6.1-hotfix-mobile-gameplay` has landed and `REQ-PROTO-007` is present in `openspec/specs/protocol/spec.md`; this change assumes the gated `pointermove` aim listener already exists
- [ ] 0.2 Run `npm run spec:validate` and confirm the `REQ-PROTO-008` delta is well-formed before touching code
- [ ] 0.3 **Measure the real event sequence on the Samsung Galaxy S20 FE** (requires the device): open the game in the in-app WebView with remote debugging attached, log `type`, `pointerType`, `button` and timestamp for `pointerdown`, `pointerup`, `mousedown` and `mouseup` on `window`, then (a) tap the canvas once and (b) perform a full joystick drag and release. Record which compatibility events fire, and when
- [ ] 0.4 Write the measured sequence into `design.md` under a new `## Measured event sequence` heading, and state explicitly whether the defect is a per-tap turbo blip or continuous boost across a drag

## 1. Node F1 — Gate the Turbo Listeners

- [ ] 1.1 In `client/src/input/desktop_controller.ts`, move the `mousedown` listener to `pointerdown`, keeping the `e.button === 0` check and adding the same `if (e.pointerType !== 'mouse') return;` early return the aim listener uses
- [ ] 1.2 Move the `mouseup` listener to `pointerup` under the same gate and the same `button === 0` check
- [ ] 1.3 Confirm no raw `mousemove`/`mousedown`/`mouseup` listener remains anywhere in `DesktopController`, so every input path in the class is a gated pointer listener
- [ ] 1.4 Confirm `_sendCurrentInput()` in `client/src/main.ts` is **not** modified — the boost OR must survive verbatim

## 2. Node F2 — Tests

- [ ] 2.1 In `client/tests/input.test.ts`, convert the left-click turbo test from `mousedown`/`mouseup` to `pointerdown`/`pointerup` with `pointerType: 'mouse'`, keeping the assertions
- [ ] 2.2 Add the `REQ-PROTO-008` scenario "Touch input cannot raise the mouse boost flag": dispatch primary-button `pointerdown`/`pointerup` with `pointerType: 'touch'` and assert `isBoost()` stays false
- [ ] 2.3 In `client/tests/input_source.test.ts`, add the scenario "Steering by touch alone transmits no boost", replaying the event sequence measured in `0.3` and asserting every transmitted packet carries `boost === false`
- [ ] 2.4 Add the scenario "Joystick turbo gesture is unaffected", asserting the double-tap-and-hold path still transmits `boost === true`
- [ ] 2.5 Mutation-check: revert the two production edits and confirm the new tests fail

## 3. Node INT — Quality Gates

- [ ] 3.1 Run `cd client && npm test` (vitest, ≥80% coverage)
- [ ] 3.2 Run `npm test` (root gate: pytest + vitest + openspec validate)
- [ ] 3.3 Run `npm run lint`
- [ ] 3.4 Run `npm run android:sync-client` so the APK assets carry the rebuilt bundle
- [ ] 3.5 Bump `versionCode`/`versionName` in `android/app/build.gradle.kts` and the version identity in `openspec/config.yaml`, `package.json`, `pyproject.toml` and `README.md`

## 4. Node VAL — On-Device Validation *(requires the physical device — user-executed)*

- [ ] 4.1 Dry-run the release workflow and install the signed APK over the previous version
- [ ] 4.2 Steer with the joystick without performing the turbo gesture and confirm the snake never boosts — no mass drain, no speed spike
- [ ] 4.3 Confirm the double-tap-and-hold turbo gesture still works
- [ ] 4.4 Repeat 4.2 and 4.3 in the system browser on the same device
- [ ] 4.5 Confirm left-click turbo still works on desktop

## 5. Node DOC — Spec Sync & Archive

- [ ] 5.1 Run `/opsx-sync` to merge `REQ-PROTO-008` into `openspec/specs/protocol/spec.md`
- [ ] 5.2 Run `npm run spec:doctor`
- [ ] 5.3 Archive as `openspec/changes/archive/AAAA-MM-DD-v1.6.2-hotfix-touch-boost-isolation/`
- [ ] 5.4 Tag and publish the release, then verify the published asset and its checksum
