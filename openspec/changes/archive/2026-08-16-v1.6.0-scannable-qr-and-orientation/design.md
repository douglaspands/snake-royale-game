## Context

See `proposal.md` for the defect analysis. `v1.5.5` made the host functional; this change makes it usable by the people it exists for. Both items sit on the path from "the host runs" to "my friends are in the match": scanning the code is how a peer joins, and portrait is how a phone is normally held.

The QR item was explicitly deferred from `v1.5.5` so that change could stay focused on making the server serve. That deferral is closed here, and the deferral was the right call — device testing has since confirmed both the server fix and the QR failure independently, which is exactly what separating them bought.

## Goals / Non-Goals

**Goals:**
- Produce a QR Code that a stock camera application on another phone decodes into an openable URL.
- Never present a QR Code that cannot lead a peer anywhere.
- Let the in-app game run in portrait and landscape, following the sensor.
- Keep rotation from interrupting an active match.

**Non-Goals:**
- Any change to the web client. It is already viewport-agnostic; verifying that was part of this change, altering it is not.
- A portrait-specific HUD layout. The existing corner anchoring and the radar's `min(130, width * 0.22)` scaling already fit a ~390 px viewport with room to spare; a bespoke layout would be speculative work against a device configuration that has not been shown to need it.
- Camera zoom compensation for the narrower portrait viewport. Visible world *area* is identical in both orientations — the viewport is rotated, not shrunk — so there is no fairness gap to close.
- Reading QR codes. The host only produces them.

## Decisions

### 1. Use ZXing rather than completing the hand-rolled encoder
- **Decision**: Add `com.google.zxing:core:3.5.3` and reduce `QRCodeHelper` to a thin wrapper over `QRCodeWriter`.
- **Rationale**: What is missing is not a bug but the majority of an encoder: Reed-Solomon generation over GF(256) with version-specific block splitting, BCH(15,5)-coded format information, the dark module, and quiet-zone handling. That is a few hundred lines of dense, spec-driven arithmetic whose failure mode is silent — it produces a symbol that renders fine and simply does not scan, which is precisely the bug being fixed and precisely what is hardest to catch without a second device in hand. ZXing is the reference implementation, pure Java with no Android or native dependency, and it collapses the whole file to roughly fifteen lines. The Android module already carries five AndroidX/Material dependencies, so this is not a departure from the project's dependency posture.
- **Note on `REQ-AND-008`**: that constraint governs Python packages bundled through Chaquopy, where the wheel availability problem lives. ZXing is a Gradle dependency of the Android module and never enters the Python dependency tree, so the pure-Python rule is not in tension here.
- **Alternatives Considered**: (a) Implementing Reed-Solomon by hand — rejected above. (b) Rendering the URL as text only and dropping the QR — rejected: scanning is the feature that makes joining frictionless, and the URL text and share button already exist as the fallback.

### 2. Suppress the QR Code on a loopback URL instead of encoding it
- **Decision**: When `NetworkHelper.getPrimaryServerUrl` yields a loopback address, hide the QR image and show the existing "enable Wi-Fi or hotspot" guidance.
- **Rationale**: `http://localhost:8000` encoded into a QR is actively misleading: a peer scans it, their phone opens `localhost` against *itself*, and they get a connection error that looks like the host is broken. A visible instruction to turn on Wi-Fi points at the actual problem. This is the difference between a failure that explains itself and one that misattributes blame — the same principle that drove the observability work in `v1.5.5`.
- **Alternatives Considered**: Rendering the QR greyed out — rejected: a dimmed but scannable symbol still gets scanned.

### 3. `fullSensor`, not `unspecified` or `user`
- **Decision**: Declare `android:screenOrientation="fullSensor"` and set `SCREEN_ORIENTATION_FULL_SENSOR`.
- **Rationale**: `fullSensor` follows the device sensor across all four orientations, including reverse-landscape, which matters for a game held two-handed where either edge may end up on top. `unspecified` hands the decision to the system and can be overridden by per-app display settings in ways that vary by OEM — poor footing on a device family already shown to diverge from AOSP. `user` respects the auto-rotate lock, which sounds appealing but means a player with rotation locked to portrait cannot get landscape at all.
- **Trade-off**: A player with auto-rotate disabled now gets sensor-driven rotation in this activity specifically. For a fullscreen game that is the conventional behavior, and the dashboard activity is unaffected.

### 4. Keep the existing `configChanges` rather than letting the activity be recreated
- **Decision**: Rely on the already-declared `configChanges="orientation|screenSize|keyboardHidden"` for layout and session continuity; override `onConfigurationChanged` only to re-apply the immersive flags.
- **Rationale**: With those flags Android resizes the activity in place instead of recreating it, so the `WebView` keeps its page, its JavaScript context and its open WebSocket. The client's own `resize` listener then re-sizes the canvas and updates the camera, so no Kotlin participates in the resize itself. Removing the flags and letting the activity recreate would reload the page and drop the player out of the match on every rotation. The one thing surviving `onCreate` does cost us is the fullscreen setup: `hideSystemUI()` is called there and would never run again, so rotation can restore the system bars. `onConfigurationChanged` re-applies it, and `onWindowFocusChanged` covers the transient-bar swipe.

## Risks / Trade-offs

- **Neither item is verifiable in CI.** A QR is proven only by scanning it with another device, and portrait only by rotating a real phone. The Gradle build proves compilation and nothing more. `tasks.md` keeps both as explicit device steps.
- **ZXing adds ~530 KB to a 40 MB APK.** Negligible in proportion, and R8 is off (`v1.5.4` Decision 3) so it ships unshrunk.
- **Portrait has not been observed on the target device.** The analysis says it should work — responsive canvas, corner-anchored HUD, scaling radar, no landscape media query — but "should" is doing real work in that sentence. If the HUD does crowd at ~390 px, a portrait media query is the follow-up, and it is cheap.
- **Reverse-portrait on a phone is rarely useful** and `fullSensor` permits it. Harmless, but it is a behavior the previous lock excluded.
