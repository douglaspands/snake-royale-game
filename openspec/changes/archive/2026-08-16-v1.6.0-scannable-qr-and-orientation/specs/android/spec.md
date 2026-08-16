## MODIFIED Requirements

### Requirement: REQ-AND-002 Wi-Fi LAN IP Resolution & QR Code Generation
The Android application SHALL automatically detect active IPv4 addresses on local network interfaces (Wi-Fi `wlan0` / Hotspot tethering), display connection URLs on the dashboard, and render a dynamic QR Code for instant peer joining. The QR Code MUST be a specification-conformant ISO/IEC 18004 symbol — carrying Reed-Solomon error-correction codewords, written format information, the dark module, and a quiet zone of at least four modules — so that a standard camera application on another device decodes it and offers the encoded URL for opening. The application MUST NOT present a QR Code encoding a loopback address, because such a symbol is undecodable into a usable destination by any other device.

#### Scenario: Wi-Fi IP discovery and QR generation
- **WHEN** the host device is connected to a local Wi-Fi network or mobile hotspot
- **THEN** the application identifies the local IPv4 address (e.g. `192.168.1.100`), displays `http://<ip>:8000`, and renders a scannable QR Code containing the URL

#### Scenario: QR Code decodes on a peer device
- **GIVEN** the dashboard displays a QR Code for a LAN URL
- **WHEN** another device points a standard camera or QR reader application at it
- **THEN** the reader MUST decode the symbol and surface `http://<ip>:8000` as an openable URL

#### Scenario: Loopback address suppresses the QR Code
- **GIVEN** no Wi-Fi or tethering interface is available, so the resolved URL is a loopback address
- **WHEN** the dashboard renders
- **THEN** the QR Code MUST be replaced by an explicit notice to enable Wi-Fi or a hotspot, rather than presenting a symbol that resolves to the scanning device itself

#### Scenario: Network interface fallback
- **WHEN** no external Wi-Fi or tethering interface is connected
- **THEN** the application falls back to `http://localhost:8000` with an explicit notice to enable Wi-Fi or hotspot for multiplayer

### Requirement: REQ-AND-004 In-App WebView and External Browser Dispatching
The Android application SHALL support dual gameplay launch modes on the host device: launching the default system browser via Android Intent, and launching a dedicated in-app hardware-accelerated WebView. The in-app WebView activity MUST support both portrait and landscape orientations, following the device sensor, and MUST NOT lock the display to landscape. Orientation changes MUST be handled without recreating the activity, so that the WebView is not reloaded and the active match is not interrupted.

#### Scenario: Launch in external browser
- **WHEN** the user taps "Jogar no Navegador"
- **THEN** an Android Intent launches the default web browser (e.g. Chrome) navigating to `http://localhost:8000`

#### Scenario: Launch in dedicated WebView
- **WHEN** the user taps "Jogar no App"
- **THEN** the application opens a fullscreen WebView activity with hardware acceleration, JavaScript enabled, and responsive touch controls

#### Scenario: Gameplay in portrait orientation
- **GIVEN** the device is held in portrait and auto-rotate is enabled
- **WHEN** the user launches the in-app WebView
- **THEN** the game MUST render in portrait, the canvas MUST fill the viewport, and the HUD corners and touch controls MUST remain within the visible area

#### Scenario: Rotation during an active match preserves session
- **GIVEN** a match is in progress in the in-app WebView
- **WHEN** the user rotates the device between portrait and landscape
- **THEN** the activity MUST NOT be recreated, the WebView MUST NOT reload, the WebSocket session MUST stay connected, and the canvas MUST resize to the new viewport
