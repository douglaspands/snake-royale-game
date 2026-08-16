## Context

See `proposal.md` § Why. This is the second half of the contamination fix begun in `v1.6.1`. That change established the mechanism — real mouse input is identified by `PointerEvent.pointerType === 'mouse'`, and anything else belongs to the virtual joystick — and applied it to the aim listener. The turbo listeners were left on raw `mousedown`/`mouseup` because `REQ-PROTO-007` speaks only of the heading angle, and the SDD rule in `CLAUDE.md` forbids production code without a validated requirement covering it. The gap was recorded as follow-up 8.1 of `v1.6.1`'s `tasks.md`.

## Goals / Non-Goals

**Goals**
- Touch and pen pointers cannot set the desktop boost flag.
- Left-click turbo on desktop behaves exactly as it does today.
- The magnitude of the defect on a real device is measured and recorded, so the regression test reflects the real event sequence rather than an assumed one.

**Non-Goals**
- Changing the boost OR in `_sendCurrentInput()`. The double-tap-and-hold joystick turbo depends on it, and `v1.6.1` preserved it deliberately.
- Changing the joystick's turbo gesture, its deadzone, or its rendering.
- Calling `preventDefault()` on the canvas `pointerdown` handler to suppress compatibility mouse events globally. That would suppress them for every consumer, including any future one, and it is a blunter instrument than gating the two listeners that actually care. See D2.
- Server-side changes. The server relays the boost flag verbatim (`REQ-PROTO-003`).
- Revisiting `REQ-PROTO-007`. The heading angle is closed.

## Decisions

### D1 — Gate the turbo listeners on `pointerType === 'mouse'`, mirroring the aim listener
`pointerdown`/`pointerup` carry the same `button` semantics as `mousedown`/`mouseup` (`0` for the primary button) and additionally carry `pointerType`. Moving the two listeners and adding the same early return the aim listener already uses keeps the file internally consistent — after this change every input path in `DesktopController` is a gated pointer listener, with no raw mouse listener left. *Alternative considered:* keep `mousedown`/`mouseup` and correlate them against a recent touch by timestamp — rejected as a heuristic reimplementation of the type the browser already reports.

### D2 — Do not suppress compatibility mouse events at the source
Calling `preventDefault()` on the canvas `pointerdown` handler would stop the browser synthesizing compatibility mouse events at all, which would also close this defect. Rejected: it changes behaviour for every listener on the page rather than the two that are wrong, it can suppress focus and click behaviour that the HUD relies on, and it leaves the underlying listeners still incorrect for any device that delivers a genuine non-mouse pointer.

### D3 — Measure before writing the regression test
Whether compatibility events fire for a whole drag or only at the end of a tap determines what the bug actually looks like on the wire, and therefore what a regression test must assert. The measurement is a task (`0.3`), not an assumption, and its result is recorded in this file before the test is written. The fix itself does not depend on the answer — the requirement is correct under either sequence — so the measurement gates only the test's shape.

### D4 — Sequential, single-session implementation
The whole change is two listeners and their tests, in one file plus two test files. `v1.6.1` split into parallel lanes because it spanned Kotlin, CSS and TypeScript with disjoint file sets; nothing like that applies here, and a parallel split would cost a worktree and a merge to save nothing. This change also touches lines immediately adjacent to `v1.6.1`'s edits, so it must be implemented after `v1.6.1` has landed, never concurrently with it.

## Risks / Trade-offs

- **[Risk]** A hybrid touch+mouse device (e.g. a Chromebook, or a tablet with a trackpad) delivers genuine `pointerType === 'mouse'` events; a real left-click there will still set boost while the player is also using touch. → Correct behaviour, not a defect: it is a genuine mouse button press. This mirrors the accepted risk already recorded against `REQ-PROTO-007`.
- **[Risk]** Some browsers dispatch `pointerdown` with `pointerType === 'mouse'` for stylus or hybrid input in ways that differ from `mousedown`'s legacy behaviour, so left-click turbo could regress on an untested browser. → Mitigation: keep the `button === 0` check unchanged and cover desktop left-click turbo with the existing test, converted rather than deleted.
- **[Risk]** The measurement in `0.3` requires the physical device and blocks the regression test's final shape. → Mitigation: the production fix and the desktop-side tests do not depend on it and can land first; only the touch-sequence regression test waits.
- **[Trade-off]** Two changes (`v1.6.1`, then this) rather than one for what a user experiences as a single "touch controls misbehave" complaint. → Accepted: the SDD rule is the binding constraint, and `v1.6.1` shipped a real, independently valuable fix rather than waiting for this one to be specified.
