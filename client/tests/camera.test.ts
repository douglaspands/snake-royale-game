import { describe, it, expect } from 'vitest';
import { Camera } from '../src/render/camera';

describe('Camera System', () => {
  it('should initialize centered on viewport and follow target smoothly', () => {
    const cam = new Camera(800, 600, 1.0);
    expect(cam.x).toBe(400);
    expect(cam.y).toBe(300);

    cam.follow(1000, 1000, true); // Snap
    expect(cam.x).toBe(1000);
    expect(cam.y).toBe(1000);

    cam.follow(1200, 1200, false);
    cam.update(0.016);
    expect(cam.x).toBeGreaterThan(1000);
    expect(cam.x).toBeLessThan(1200);
  });

  it('should convert coordinates between screen and world correctly', () => {
    const cam = new Camera(800, 600, 1.0);
    cam.follow(500, 500, true);
    cam.zoom = 2.0;

    // World position (500, 500) corresponds to Screen center (400, 300)
    const screenPos = cam.worldToScreen(500, 500);
    expect(screenPos.x).toBeCloseTo(400, 1);
    expect(screenPos.y).toBeCloseTo(300, 1);

    // Screen center (400, 300) converts back to World (500, 500)
    const worldPos = cam.screenToWorld(400, 300);
    expect(worldPos.x).toBeCloseTo(500, 1);
    expect(worldPos.y).toBeCloseTo(500, 1);
  });

  it('should compute visible bounds with padding', () => {
    const cam = new Camera(800, 600, 1.0);
    cam.follow(1000, 1000, true);
    cam.zoom = 1.0;

    const bounds = cam.getVisibleBounds(50);
    expect(bounds.minX).toBe(1000 - 400 - 50); // 550
    expect(bounds.maxX).toBe(1000 + 400 + 50); // 1450
    expect(bounds.minY).toBe(1000 - 300 - 50); // 650
    expect(bounds.maxY).toBe(1000 + 300 + 50); // 1350
  });
});
