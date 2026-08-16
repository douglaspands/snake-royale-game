import { describe, it, expect, beforeEach } from 'vitest';
import { DesktopController } from '../src/input/desktop_controller';
import { VirtualJoystick } from '../src/input/virtual_joystick';

/** Builds a synthetic pointermove carrying an explicit pointerType. */
function pointerMove(pointerType: string, clientX: number, clientY: number): Event {
  return { type: 'pointermove', pointerType, clientX, clientY } as unknown as Event;
}

/** Shorthand for a genuine mouse-driven pointermove. */
function mousePointerMove(clientX: number, clientY: number): Event {
  return pointerMove('mouse', clientX, clientY);
}

describe('Desktop Controller', () => {
  let eventListeners: Record<string, Array<(e: any) => void>>;

  beforeEach(() => {
    eventListeners = {};
    const mockWindow = {
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
    (globalThis as any).window = mockWindow;
  });

  it('should calculate mouse aim angle relative to screen center', () => {
    const controller = new DesktopController();
    // Cursor to the right of center (400, 300) -> angle 0
    window.dispatchEvent(mousePointerMove(600, 300));
    expect(controller.getAngle()).toBeCloseTo(0.0, 3);

    // Cursor directly below center -> angle PI/2
    window.dispatchEvent(mousePointerMove(400, 500));
    expect(controller.getAngle()).toBeCloseTo(Math.PI / 2, 3);
  });

  it('should toggle boost state manually', () => {
    const controller = new DesktopController();
    expect(controller.isBoost()).toBe(false);
    controller.setBoost(true);
    expect(controller.isBoost()).toBe(true);
  });

  it('should handle keyboard WASD, Arrow keys and Spacebar turbo', () => {
    const controller = new DesktopController();

    // Trigger KeyW (Up)
    window.dispatchEvent({ type: 'keydown', code: 'KeyW' } as unknown as Event);
    expect(controller.getAngle()).toBeCloseTo(-Math.PI / 2, 3);

    // Trigger KeyD (Up + Right)
    window.dispatchEvent({ type: 'keydown', code: 'KeyD' } as unknown as Event);
    expect(controller.getAngle()).toBeCloseTo(-Math.PI / 4, 3);

    // Trigger Space (Boost)
    window.dispatchEvent({ type: 'keydown', code: 'Space' } as unknown as Event);
    expect(controller.isBoost()).toBe(true);

    // Release KeyW and KeyD
    window.dispatchEvent({ type: 'keyup', code: 'KeyW' } as unknown as Event);
    window.dispatchEvent({ type: 'keyup', code: 'KeyD' } as unknown as Event);
    window.dispatchEvent({ type: 'keyup', code: 'Space' } as unknown as Event);
    expect(controller.isBoost()).toBe(false);

    // Trigger ArrowLeft and ArrowDown
    window.dispatchEvent({ type: 'keydown', code: 'ArrowLeft' } as unknown as Event);
    window.dispatchEvent({ type: 'keydown', code: 'ArrowDown' } as unknown as Event);
    expect(controller.getAngle()).toBeCloseTo((3 * Math.PI) / 4, 3);

    window.dispatchEvent({ type: 'keyup', code: 'ArrowLeft' } as unknown as Event);
    window.dispatchEvent({ type: 'keyup', code: 'ArrowDown' } as unknown as Event);
  });

  it('should handle mouse down, move and up events', () => {
    const controller = new DesktopController();

    // Mouse move
    window.dispatchEvent(mousePointerMove(600, 300));
    expect(controller.getAngle()).toBeCloseTo(0.0, 3);

    // Left click down -> Boost
    window.dispatchEvent({ type: 'mousedown', button: 0 } as unknown as Event);
    expect(controller.isBoost()).toBe(true);

    // Left click up
    window.dispatchEvent({ type: 'mouseup', button: 0 } as unknown as Event);
    expect(controller.isBoost()).toBe(false);
  });

  // REQ-PROTO-007 Scenario: touch input cannot contaminate mouse aim
  it('should ignore pointer events that are not mouse-driven', () => {
    const controller = new DesktopController();
    let notifications = 0;
    controller.onInputChange = () => {
      notifications++;
    };

    // Aim down-right of center (400, 300) with a real mouse -> PI/4
    window.dispatchEvent(mousePointerMove(600, 500));
    expect(controller.getAngle()).toBeCloseTo(Math.PI / 4, 3);
    expect(notifications).toBe(1);

    // Touch and pen pointers below center must leave the aim untouched
    window.dispatchEvent(pointerMove('touch', 400, 590));
    window.dispatchEvent(pointerMove('pen', 400, 590));
    expect(controller.getAngle()).toBeCloseTo(Math.PI / 4, 3);
    expect(notifications).toBe(1);
  });

  it('should hand aim back to the mouse after keyboard steering', () => {
    const controller = new DesktopController();

    window.dispatchEvent({ type: 'keydown', code: 'KeyW' } as unknown as Event);
    expect(controller.getAngle()).toBeCloseTo(-Math.PI / 2, 3);

    // A genuine mouse move overrides the keyboard heading
    window.dispatchEvent(mousePointerMove(600, 300));
    expect(controller.getAngle()).toBeCloseTo(0.0, 3);

    window.dispatchEvent({ type: 'keyup', code: 'KeyW' } as unknown as Event);
  });
});

describe('Virtual Joystick (Mobile Touch & Double-Tap Gesture)', () => {
  it('should activate on pointer down and clamp knob within radius', () => {
    const joystick = new VirtualJoystick(60.0);
    expect(joystick.isActive()).toBe(false);

    // Touch down at (200, 400)
    joystick.handlePointerDown(1, 200, 400);
    expect(joystick.isActive()).toBe(true);

    // Move touch 100px to the right -> knob should be clamped to 60px
    joystick.handlePointerMove(1, 300, 400);
    expect(joystick.getAngle()).toBeCloseTo(0.0, 3);
    const render = joystick.getRenderState();
    expect(render.knobX).toBeCloseTo(260.0, 1);
    expect(render.knobY).toBeCloseTo(400.0, 1);

    // Release touch
    joystick.handlePointerUp(1);
    expect(joystick.isActive()).toBe(false);
  });

  it('should support double-tap & hold gesture for turbo boost', () => {
    const joystick = new VirtualJoystick(60.0);

    // 1st Tap
    joystick.handlePointerDown(1, 100, 300);
    expect(joystick.isBoost()).toBe(false);
    joystick.handlePointerUp(1);

    // 2nd Tap within window -> Turbo triggers
    joystick.handlePointerDown(1, 100, 300);
    expect(joystick.isBoost()).toBe(true);

    // Release 2nd tap -> Turbo stops
    joystick.handlePointerUp(1);
    expect(joystick.isBoost()).toBe(false);
  });

  it('should support multi-touch secondary finger turbo boost', () => {
    const joystick = new VirtualJoystick(60.0);
    // Pointer 1: Joystick movement
    joystick.handlePointerDown(1, 100, 300, false);
    expect(joystick.isActive()).toBe(true);
    expect(joystick.isBoost()).toBe(false);

    // Pointer 2: Secondary finger anywhere on screen
    joystick.handlePointerDown(2, 700, 300, false);
    expect(joystick.isBoost()).toBe(true);

    // Release secondary finger
    joystick.handlePointerUp(2);
    expect(joystick.isBoost()).toBe(false);
    expect(joystick.isActive()).toBe(true);
  });

  it('should trigger onInputChange callback instantly on significant angle or boost changes', () => {
    const joystick = new VirtualJoystick(60.0);
    let notifiedAngle: number | null = null;
    let notifiedBoost: boolean | null = null;

    joystick.onInputChange = (angle, boost) => {
      notifiedAngle = angle;
      notifiedBoost = boost;
    };

    joystick.handlePointerDown(1, 100, 100);
    // Move significantly past deadzone
    joystick.handlePointerMove(1, 150, 100); // moving right -> angle = 0
    expect(notifiedAngle).toBeCloseTo(0.0, 2);

    joystick.setBoost(true);
    expect(notifiedBoost).toBe(true);
  });
});
