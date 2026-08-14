import { describe, it, expect } from 'vitest';
import { Camera } from '../src/render/camera';
import { GameRenderer } from '../src/render/renderer';
import { MockCanvasElement } from './harness/canvas_mock';
import { PacketGenerator } from './harness/packet_generator';
import { EntityInterpolator } from '../src/net/interpolator';

describe('Rendering & Nameplate Stabilization (REQ-REND-001 / REQ-REND-002)', () => {
  it('should lock camera directly to local player head to eliminate relative drift', () => {
    const cam = new Camera(800, 600, 1.0);
    // Follow local player with directLock
    cam.follow(543.2847, 801.9123, true);
    expect(cam.x).toBe(543.2847);
    expect(cam.y).toBe(801.9123);

    // World position of local player projects exactly to screen center
    const screenPos = cam.worldToScreen(543.2847, 801.9123);
    expect(screenPos.x).toBe(400); // 800 / 2
    expect(screenPos.y).toBe(300); // 600 / 2
  });

  it('should project nameplate coordinates to integer screen pixels', () => {
    const cam = new Camera(800, 600, 1.0);
    cam.follow(500, 500, true);

    // Other snake at fractional position
    const otherSnakePos = { x: 550.384, y: 480.719 };
    const screenPos = cam.worldToScreen(otherSnakePos.x, otherSnakePos.y);

    const intScreenX = Math.round(screenPos.x);
    const intScreenY = Math.round(screenPos.y);

    expect(Number.isInteger(intScreenX)).toBe(true);
    expect(Number.isInteger(intScreenY)).toBe(true);
    expect(intScreenX).toBe(450);
    expect(intScreenY).toBe(281);
  });

  it('should render nameplates outside world transform in screen space', () => {
    const canvas = new MockCanvasElement();
    const cam = new Camera(800, 600, 1.0);
    const renderer = new GameRenderer(canvas as unknown as HTMLCanvasElement, cam);

    const interpolator = new EntityInterpolator();
    const snake = PacketGenerator.createLinearSnake('local-1', 500.5, 500.5, 0.0);
    snake.nickname = 'SteadyViper';
    const snapshot = PacketGenerator.createSnapshot(1, 1000.0, [snake]);
    interpolator.pushSnapshot(snapshot);

    const worldState = interpolator.getInterpolatedState(1000.0);
    renderer.render(worldState, 'local-1');

    // Verify that fillText was called
    const textCalls = canvas.context.drawCalls.filter((c) => c.method === 'fillText');
    expect(textCalls.length).toBeGreaterThan(0);
    const nameCall = textCalls.find((c) => c.args[0] === 'SteadyViper');
    expect(nameCall).toBeDefined();

    // Verify that the coordinates passed to fillText are integer screen pixels
    const textX = nameCall!.args[1];
    const textY = nameCall!.args[2];
    expect(Number.isInteger(textX)).toBe(true);
    expect(Number.isInteger(textY)).toBe(true);
  });
});
