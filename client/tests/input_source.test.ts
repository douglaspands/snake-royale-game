/**
 * REQ-PROTO-007 — the INPUT stream must carry the heading of exactly one control
 * scheme at a time. Exercises the real DesktopController and VirtualJoystick wired
 * the way main.ts wires them, then asserts the angle main.ts would transmit.
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { DesktopController } from '../src/input/desktop_controller';
import { VirtualJoystick } from '../src/input/virtual_joystick';
import type { InputSource } from '../src/main';

let resolveInputAngle: (
  source: InputSource,
  desktop: DesktopController,
  joystick: VirtualJoystick
) => number;

let eventListeners: Record<string, Array<(e: any) => void>>;

function installMockWindow(): void {
  eventListeners = {};
  (globalThis as any).window = {
    innerWidth: 800,
    innerHeight: 600,
    addEventListener: (evt: string, cb: (e: any) => void) => {
      if (!eventListeners[evt]) eventListeners[evt] = [];
      eventListeners[evt].push(cb);
    },
    dispatchEvent: (evt: any) => {
      const cbs = eventListeners[evt.type] || [];
      for (const cb of cbs) cb(evt);
      return true;
    },
  };
}

/**
 * Mirrors the input wiring of SnakeRoyaleApp._setupInputListeners: the scheme that
 * last fired onInputChange owns the transmitted heading.
 */
class InputStreamHarness {
  public readonly desktop = new DesktopController();
  public readonly joystick = new VirtualJoystick(60.0);
  public source: InputSource = 'desktop';

  constructor() {
    this.desktop.onInputChange = () => {
      this.source = 'desktop';
    };
    this.joystick.onInputChange = () => {
      this.source = 'joystick';
    };
  }

  /** Angle that _sendCurrentInput would put into the next INPUT packet. */
  public transmittedAngle(): number {
    return resolveInputAngle(this.source, this.desktop, this.joystick);
  }
}

describe('Single active input source for the INPUT stream', () => {
  beforeAll(async () => {
    // main.ts registers a DOMContentLoaded listener at module scope
    installMockWindow();
    resolveInputAngle = (await import('../src/main')).resolveInputAngle;
  });

  beforeEach(() => {
    installMockWindow();
  });

  it('should hold the joystick heading after the finger is released', () => {
    const harness = new InputStreamHarness();

    // Desktop aim points down-right of screen center, the joystick will point up
    window.dispatchEvent({
      type: 'pointermove',
      pointerType: 'mouse',
      clientX: 600,
      clientY: 500,
    } as unknown as Event);
    expect(harness.source).toBe('desktop');
    expect(harness.transmittedAngle()).toBeCloseTo(Math.PI / 4, 3);

    // Steer upwards with the joystick
    harness.joystick.handlePointerDown(1, 200, 400);
    harness.joystick.handlePointerMove(1, 200, 300);
    expect(harness.source).toBe('joystick');
    expect(harness.transmittedAngle()).toBeCloseTo(-Math.PI / 2, 3);

    // Release: the heading must stay the joystick's own last command
    harness.joystick.handlePointerUp(1);
    expect(harness.joystick.isActive()).toBe(false);
    expect(harness.source).toBe('joystick');
    expect(harness.transmittedAngle()).toBeCloseTo(-Math.PI / 2, 3);
  });

  it('should not let a touch-synthesized pointer event steer the released joystick', () => {
    const harness = new InputStreamHarness();

    harness.joystick.handlePointerDown(1, 200, 400);
    harness.joystick.handlePointerMove(1, 200, 300);
    harness.joystick.handlePointerUp(1);

    // Touch platforms emit a synthetic pointer/mouse move near the lower half of
    // the viewport on release: it must not become the transmitted heading.
    window.dispatchEvent({
      type: 'pointermove',
      pointerType: 'touch',
      clientX: 400,
      clientY: 590,
    } as unknown as Event);

    expect(harness.source).toBe('joystick');
    expect(harness.transmittedAngle()).toBeCloseTo(-Math.PI / 2, 3);
  });

  it('should switch back to mouse aim after the joystick was last active', () => {
    const harness = new InputStreamHarness();

    harness.joystick.handlePointerDown(1, 200, 400);
    harness.joystick.handlePointerMove(1, 200, 300);
    harness.joystick.handlePointerUp(1);
    expect(harness.source).toBe('joystick');

    // A genuine mouse move takes ownership of the heading
    window.dispatchEvent({
      type: 'pointermove',
      pointerType: 'mouse',
      clientX: 600,
      clientY: 500,
    } as unknown as Event);
    expect(harness.source).toBe('desktop');
    expect(harness.transmittedAngle()).toBeCloseTo(Math.PI / 4, 3);
  });

  it('should switch back to keyboard aim after the joystick was last active', () => {
    const harness = new InputStreamHarness();

    harness.joystick.handlePointerDown(1, 200, 400);
    harness.joystick.handlePointerMove(1, 200, 300);
    harness.joystick.handlePointerUp(1);
    expect(harness.source).toBe('joystick');

    window.dispatchEvent({ type: 'keydown', code: 'KeyD' } as unknown as Event);
    expect(harness.source).toBe('desktop');
    expect(harness.transmittedAngle()).toBeCloseTo(0.0, 3);

    window.dispatchEvent({ type: 'keyup', code: 'KeyD' } as unknown as Event);
  });
});
