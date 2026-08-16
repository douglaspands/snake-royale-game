## Why

`v1.6.1` closed the touch contamination of the **heading angle** (`REQ-PROTO-007`): `DesktopController`'s aim listener moved to `pointermove` gated on `pointerType === 'mouse'`, and `_sendCurrentInput()` now reads the angle from the last-active control scheme. The **boost flag** was deliberately left out of that change, because `REQ-PROTO-007` governs the heading angle only and this project does not admit production code ahead of a validated requirement. This change specifies the boost half.

`DesktopController._bindEvents()` still binds turbo to raw mouse buttons:

```
window.addEventListener('mousedown', (e: MouseEvent) => {
  if (e.button === 0) { this._boost = true;  this._notifyChange(true); }
});
window.addEventListener('mouseup',   (e: MouseEvent) => {
  if (e.button === 0) { this._boost = false; this._notifyChange(true); }
});
```

Browsers dispatch compatibility `mousedown`/`mouseup` events for touch interactions that are not `preventDefault()`ed, and `button` is `0` for a primary touch. Nothing in the canvas `pointerdown` handler in `client/src/main.ts` calls `preventDefault()`, so nothing suppresses them. Touch can therefore set `_boost = true`, and `_sendCurrentInput()` forwards it: the boost flag is an OR of both schemes (`desktop.isBoost()`, then `if (joystick.isBoost()) boost = true`) — deliberately, so the double-tap-and-hold turbo keeps working regardless of which scheme owns the angle — which means a desktop-sourced `_boost` reaches the wire even while the joystick owns the heading.

The player-visible effect is unwanted turbo on touch: boost costs mass in `REQ-PHYS-002`, so it drains the snake without the player ever asking for it.

**The magnitude is not yet established, and this change measures it before fixing it.** Compatibility mouse events are commonly suppressed during a drag and emitted only at the end of a tap. If that holds here, the effect is a brief turbo blip per tap; if compatibility events are emitted for the whole gesture, every joystick drag transmits turbo continuously. Both are defects and both are closed by the same requirement — the measurement decides urgency and gives the regression test its shape, not whether to fix it.

## What Changes

- The desktop turbo listeners move from `mousedown`/`mouseup` to `pointerdown`/`pointerup`, gated on `pointerType === 'mouse'`, mirroring the treatment `v1.6.1` gave the aim listener. Touch and pen pointers can no longer set the desktop boost flag.
- The `button === 0` primary-button check is preserved, so left-click turbo on desktop is unchanged.
- The boost OR in `_sendCurrentInput()` is **not** touched: the double-tap-and-hold joystick turbo must keep working. Only the contaminated source is closed.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `protocol`: adds `REQ-PROTO-008`, extending the single-active-input-source rule established by `REQ-PROTO-007` from the heading angle to the boost flag.

## Impact

- `client/src/input/desktop_controller.ts` — the two turbo listeners.
- `client/tests/input.test.ts` — the left-click turbo test dispatches `mousedown`/`mouseup` and must move to gated pointer events.
- `client/tests/input_source.test.ts` — gains the boost-contamination scenario alongside the existing heading scenarios.
- **No server change.** The server relays the boost flag as received (`REQ-PROTO-003`).
- **No Android change.** This is a client defect reproducible in any mobile browser; the WebView only hosts it.
- **Depends on `v1.6.1`.** This change assumes `REQ-PROTO-007` is already in place — same file, adjacent listeners — so it must not be implemented in parallel with it.
