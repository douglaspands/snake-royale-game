import { describe, it, expect } from 'vitest';
import { EntityInterpolator } from '../src/net/interpolator';
import { PacketGenerator } from './harness/packet_generator';

describe('Entity Interpolator', () => {
  it('should interpolate positions smoothly between consecutive snapshots', () => {
    const interpolator = new EntityInterpolator();
    interpolator.interpolationDelayMs = 50.0;

    const s1 = PacketGenerator.createSnapshot(1, 1000.0, [
      PacketGenerator.createLinearSnake('p-1', 100.0, 100.0, 0.0),
    ]);
    const s2 = PacketGenerator.createSnapshot(2, 1100.0, [
      PacketGenerator.createLinearSnake('p-1', 200.0, 100.0, 0.0),
    ]);

    interpolator.pushSnapshot(s1);
    interpolator.pushSnapshot(s2);

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
    interpolator.pushSnapshot(s1);
    const state = interpolator.getInterpolatedState(1000);
    expect(state).not.toBeNull();
    expect(state!.tick).toBe(1);
  });
});
