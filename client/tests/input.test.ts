import { describe, it, expect } from 'vitest';
import { DesktopController } from '../src/input/desktop_controller';
import { VirtualJoystick } from '../src/input/virtual_joystick';

describe('Desktop Controller', () => {
  it('should calculate mouse aim angle relative to screen center', () => {
    const controller = new DesktopController();
    // Cursor to the right of center -> angle 0
    controller.setMousePosition(600, 300, 400, 300);
    expect(controller.getAngle()).toBeCloseTo(0.0, 3);

    // Cursor directly below center -> angle PI/2
    controller.setMousePosition(400, 500, 400, 300);
    expect(controller.getAngle()).toBeCloseTo(Math.PI / 2, 3);
  });

  it('should toggle boost state', () => {
    const controller = new DesktopController();
    expect(controller.isBoost()).toBe(false);
    controller.setBoost(true);
    expect(controller.isBoost()).toBe(true);
  });
});

describe('Virtual Joystick (Mobile Touch)', () => {
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

  it('should support multi-touch turbo button independently', () => {
    const joystick = new VirtualJoystick(60.0);
    // Pointer 1: Joystick movement
    joystick.handlePointerDown(1, 100, 300, false);
    expect(joystick.isActive()).toBe(true);
    expect(joystick.isBoost()).toBe(false);

    // Pointer 2: Turbo button touch
    joystick.handlePointerDown(2, 700, 300, true);
    expect(joystick.isBoost()).toBe(true);

    // Release joystick while keeping turbo active
    joystick.handlePointerUp(1);
    expect(joystick.isActive()).toBe(false);
    expect(joystick.isBoost()).toBe(true);

    // Release turbo
    joystick.handlePointerUp(2);
    expect(joystick.isBoost()).toBe(false);
  });
});
