## Why

`v1.6.0` unlocked portrait/landscape and shipped a scannable QR Code, so the Android host is finally usable by peers. Two gameplay defects remain on the touch paths, both reported against real devices, and neither is governed by an existing requirement.

**1. Releasing the virtual joystick steers the snake the wrong way.** On every touch platform (mobile browsers and the in-app WebView), letting go of the on-screen joystick makes the snake drift — most visibly downward — instead of holding the last commanded heading. Root cause: `client/src/main.ts:156` registers a redundant global `mousemove` listener that touch input synthesizes at release time. That synthetic event fires near the joystick's on-screen position (typically the lower half of the viewport) and silently overwrites the desktop mouse-aim controller's stored angle via `DesktopController.setMousePosition()`. `_sendCurrentInput()` (`client/src/main.ts:117`) then branches on `virtualJoystick.isActive()` and falls back to that contaminated desktop angle the instant the joystick goes inactive. Nothing in `openspec/specs/protocol/spec.md` states which input source the client may derive its transmitted heading from.

**2. "Jogar no App" renders the game shrunk, with a margin around it.** Launching the in-app WebView draws the game smaller than the available display area, unlike the same URL opened in the system browser, which fills the screen. The Android window itself is already correct — `Theme.SnakeRoyaleHost.Fullscreen` sets `windowFullscreen`, `activity_game_webview.xml` is `match_parent`, and `hideSystemUI()` runs on create, on rotation and on focus. The shrink comes from the WebView's page-scale layer: `GameWebViewActivity.setupWebView()` enables `useWideViewPort = true` together with `loadWithOverviewMode = true`. That pair exists to render legacy desktop-width pages — it emulates a wide layout viewport and then zooms the page out ("overview") until the content width fits. The SPA already declares `width=device-width, initial-scale=1.0` in `client/index.html`, so the emulation buys nothing and the shrink-to-fit path is pure damage. Because `setSupportZoom(false)` is also set, the player cannot zoom back in.

The client makes that easy to trigger: `#app` is sized `100vw`/`100vh` in `client/src/index.css`, and `_setupResize()` sizes the canvas from `window.innerWidth`/`innerHeight` — the *visual* viewport, which in a WebView is itself a function of the current page scale. Any sub-pixel excess over the layout viewport is horizontal overflow, and overview mode answers overflow by zooming out further. Fixing only the Android side would leave that trigger armed.

## What Changes

**Client input source (capability `protocol`)**
- Mouse-aim tracking moves from `mousemove` to `pointermove` gated on `pointerType === 'mouse'`, so touch- and pen-synthesized events can no longer alter the aimed heading.
- The redundant always-on `mousemove` listener in `main.ts` is removed, superseded by the properly gated listener already owned by `DesktopController`. `DesktopController.setMousePosition()` goes with it — that listener was its only caller.
- `_sendCurrentInput()` derives the transmitted heading from whichever control scheme last actually produced input, instead of branching on `virtualJoystick.isActive()`.

**Android WebView viewport (capability `android`)**
- `useWideViewPort` and `loadWithOverviewMode` are turned off in `GameWebViewActivity`. The SPA declares its own viewport; the WebView must honour it at 1:1 page scale rather than emulating a wide layout and shrinking to fit.
- The initial scale is left to the viewport meta tag — `setInitialScale` is never called with a non-zero value.

**Client viewport sizing (capability `rendering`)**
- `#app` moves from `100vw`/`100vh` to `100%`, which resolves against the already-`100%` `html, body` and cannot exceed the layout viewport.
- `_setupResize()` measures `document.documentElement.clientWidth`/`clientHeight` (the layout viewport) instead of `window.innerWidth`/`innerHeight` (the visual viewport), so the drawing surface never overflows the page and never feeds back into a page-scale change.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `protocol`: adds `REQ-PROTO-007` governing which client-side input source the transmitted `INPUT` heading angle may be derived from, and what happens when the active touch control is released.
- `android`: modifies `REQ-AND-004` to require the in-app WebView to present the game at 1:1 page scale filling the activity window, with no shrink-to-fit.
- `rendering`: adds `REQ-REND-005` requiring the drawing surface to match the layout viewport exactly and never exceed it on either axis.

## Impact

- **Affected files**
  - `client/src/input/desktop_controller.ts` — pointer-type gating; `setMousePosition()` removed.
  - `client/src/main.ts` — redundant listener removed, last-active-source selection in `_sendCurrentInput()`, layout-viewport measurement in `_setupResize()`.
  - `client/src/index.css` — `#app` sizing.
  - `client/tests/input.test.ts` — pointer-event simulation updated to match the new gating.
  - `android/app/src/main/java/com/snakeroyale/host/GameWebViewActivity.kt` — WebView viewport settings.
  - `android/app/build.gradle.kts` — `versionCode = 7`, `versionName = "1.6.1"`.
  - `openspec/config.yaml`, `package.json`, `README.md` — version identity.
- **Execution model** — implemented by three parallel sub-agent lanes over isolated git worktrees; see `design.md` § Parallel execution and `tasks.md`.
- **No new dependencies.** No server or protocol wire-format change: the server already relays whatever `target_angle` it receives (`REQ-PROTO-003`). No Python source is modified.
- **Zero breaking API changes.** Desktop mouse and keyboard aim keep their current behaviour.
