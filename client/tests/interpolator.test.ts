import { describe, it, expect } from 'vitest';
import { EntityInterpolator } from '../src/net/interpolator';
import { PacketGenerator } from './harness/packet_generator';

describe('Entity Interpolator (Anti-Jitter Clock-Synchronized)', () => {
  it('should interpolate positions smoothly between consecutive snapshots with arrival timestamps', () => {
    const interpolator = new EntityInterpolator();
    interpolator.interpolationDelayMs = 50.0;

    const s1 = PacketGenerator.createSnapshot(1, 1700000000000.0, [
      PacketGenerator.createLinearSnake('p-1', 100.0, 100.0, 0.0),
    ]);
    const s2 = PacketGenerator.createSnapshot(2, 1700000000100.0, [
      PacketGenerator.createLinearSnake('p-1', 200.0, 100.0, 0.0),
    ]);

    // Push with client arrival times
    interpolator.pushSnapshot(s1, 1000.0);
    interpolator.pushSnapshot(s2, 1100.0);

    // Midpoint render time = 1100 - 50 = 1050ms
    const state = interpolator.getInterpolatedState(1100.0);
    expect(state).not.toBeNull();
    expect(state!.snakes.length).toBe(1);

    // Alpha should be (1050 - 1000) / (1100 - 1000) = 0.5 -> x = 150.0
    const snake = state!.snakes[0];
    expect(snake.head.x).toBeCloseTo(150.0, 1);
    expect(snake.head.y).toBeCloseTo(100.0, 1);
  });

  it('should handle edge cases (empty buffer, single snapshot)', () => {
    const interpolator = new EntityInterpolator();
    expect(interpolator.getInterpolatedState(1000)).toBeNull();

    const s1 = PacketGenerator.createSnapshot(1, 1000.0);
    interpolator.pushSnapshot(s1, 1000.0);
    const state = interpolator.getInterpolatedState(1000.0);
    expect(state).not.toBeNull();
    expect(state!.tick).toBe(1);
  });

  it('should dynamically adapt interpolation delay based on snapshot arrival deltas', () => {
    const interpolator = new EntityInterpolator();
    expect(interpolator.interpolationDelayMs).toBe(45.0);

    // Simulate 5 snapshots arriving every 33.3ms
    let time = 1000;
    for (let i = 0; i < 5; i++) {
      time += 33.3;
      const snap = PacketGenerator.createSnapshot(i + 1, time);
      interpolator.pushSnapshot(snap, time);
    }

    // Delay should remain low and tight (between 35ms and 60ms)
    expect(interpolator.interpolationDelayMs).toBeGreaterThanOrEqual(35.0);
    expect(interpolator.interpolationDelayMs).toBeLessThanOrEqual(60.0);
  });
});
