## MODIFIED Requirements

> Baseline note: this delta builds on the `REQ-AND-004` text introduced by `v1.6.0-scannable-qr-and-orientation`, which has not yet been synced into `openspec/specs/android/spec.md`. The orientation clauses below are carried forward verbatim from that change and must not be dropped when merging.

### Requirement: REQ-AND-004 In-App WebView and External Browser Dispatching
The Android application SHALL support dual gameplay launch modes on the host device: launching the default system browser via Android Intent, and launching a dedicated in-app hardware-accelerated WebView. The in-app WebView activity MUST support both portrait and landscape orientations, following the device sensor, and MUST NOT lock the display to landscape. Orientation changes MUST be handled without recreating the activity, so that the WebView is not reloaded and the active match is not interrupted. The in-app WebView MUST honour the viewport declared by the loaded document at a page scale of 1.0, filling the activity window; it MUST NOT emulate a wide layout viewport nor scale the page down to fit its contents, so that the game occupies the same proportion of the display as it does in the system browser.

#### Scenario: Launch in external browser
- **WHEN** the user taps "Jogar no Navegador"
- **THEN** an Android Intent launches the default web browser (e.g. Chrome) navigating to `http://localhost:8000`

#### Scenario: Launch in dedicated WebView
- **WHEN** the user taps "Jogar no App"
- **THEN** the application opens a fullscreen WebView activity with hardware acceleration, JavaScript enabled, and responsive touch controls

#### Scenario: In-app game fills the display at native scale
- **GIVEN** the bundled SPA declares `width=device-width, initial-scale=1.0`
- **WHEN** the user launches the in-app WebView
- **THEN** the page scale MUST be 1.0, the rendered game MUST span the full width and height of the activity window with no surrounding margin, and it MUST NOT be shrunk to fit

#### Scenario: Gameplay in portrait orientation
- **GIVEN** the device is held in portrait and auto-rotate is enabled
- **WHEN** the user launches the in-app WebView
- **THEN** the game MUST render in portrait, the canvas MUST fill the viewport, and the HUD corners and touch controls MUST remain within the visible area

#### Scenario: Rotation during an active match preserves session
- **GIVEN** a match is in progress in the in-app WebView
- **WHEN** the user rotates the device between portrait and landscape
- **THEN** the activity MUST NOT be recreated, the WebView MUST NOT reload, the WebSocket session MUST stay connected, and the canvas MUST resize to the new viewport
