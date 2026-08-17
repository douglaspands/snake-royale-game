/**
 * Unit Tests for Client-Side Prediction (CSP) and Reconciliation Engine.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalPredictor } from '../src/net/local_predictor';
import { InterpolatedSnake } from '../src/net/interpolator';

describe('LocalPredictor — Client-Side Prediction & Anti-Snap Reconciliation', () => {
  let predictor: LocalPredictor;

  const mockServerSnake: InterpolatedSnake = {
    id: 'player-local',
    nickname: 'ViperKing',
    skin: 'neon_blue',
    head: { x: 500, y: 500, angle: 0 },
    body: [
      { x: 492, y: 500 },
      { x: 484, y: 500 },
      { x: 476, y: 500 },
    ],
    mass: 3.0,
    alive: true,
    score: 30,
    boost: false,
  };

  beforeEach(() => {
    predictor = new LocalPredictor();
  });

  it('should initialize correctly from server snapshot', () => {
    expect(predictor.isInitialized()).toBe(false);
    predictor.initialize(mockServerSnake);
    expect(predictor.isInitialized()).toBe(true);
    expect(predictor.id).toBe('player-local');
    expect(predictor.head.x).toBe(500);
    expect(predictor.head.y).toBe(500);
  });

  it('should immediately predict movement forward without network delay', () => {
    predictor.initialize(mockServerSnake);
    predictor.setInput(0, false, 1);

    // Step 0.1s at 180 px/s forward (18 px)
    predictor.step(0.1);

    const predicted = predictor.getPredictedSnake();
    expect(predicted.head.x).toBeCloseTo(518, 0.1);
    expect(predicted.head.y).toBeCloseTo(500, 0.1);
    expect(predicted.body.length).toBe(3);
  });

  it('should turn rapidly with agile base turn rate (9.8 rad/s)', () => {
    predictor.initialize(mockServerSnake);
    // Request 90 degree turn (pi/2)
    predictor.setInput(Math.PI / 2, false, 2);

    expect(predictor.getTurnRate()).toBeCloseTo(9.8, 0.1);

    // In 0.165s at 9.8 rad/s, it should reach or surpass pi/2
    predictor.step(0.165);
    expect(predictor.head.angle).toBeCloseTo(Math.PI / 2, 0.05);
  });

  it('should reconcile subtle server drift smoothly via exponential error decay', () => {
    predictor.initialize(mockServerSnake);
    predictor.setInput(0, false, 3);
    predictor.step(0.1); // x is at 518

    // Server says head is at 520 (drift = 2px)
    const updatedServerSnake: InterpolatedSnake = {
      ...mockServerSnake,
      head: { x: 520, y: 500, angle: 0 },
    };

    predictor.reconcileSnapshot(updatedServerSnake);

    const smoothPredicted = predictor.getPredictedSnake();
    // Should be close to reconciled state without snapping
    expect(smoothPredicted.head.x).toBeGreaterThan(518);
  });

  it('should hard snap on catastrophic desync (> 180px)', () => {
    predictor.initialize(mockServerSnake);

    const teleportedServerSnake: InterpolatedSnake = {
      ...mockServerSnake,
      head: { x: 1000, y: 1000, angle: 0 },
    };

    predictor.reconcileSnapshot(teleportedServerSnake);
    expect(predictor.head.x).toBe(1000);
    expect(predictor.head.y).toBe(1000);
  });

  it('REQ-PROTO-009: unflagged large drift still hard-snaps instantly (regression)', () => {
    predictor.initialize(mockServerSnake);

    const teleportedServerSnake: InterpolatedSnake = {
      ...mockServerSnake,
      head: { x: 1000, y: 1000, angle: 0 },
    };

    // Explicit false, matching the omitted-argument default behavior above.
    predictor.reconcileSnapshot(teleportedServerSnake, false);

    expect(predictor.head.x).toBe(1000);
    expect(predictor.head.y).toBe(1000);
    // Instant correction leaves no residual visual offset to decay.
    const predicted = predictor.getPredictedSnake();
    expect(predicted.head.x).toBe(1000);
    expect(predicted.head.y).toBe(1000);
  });

  it('REQ-PROTO-009: drift caused by a flagged stall eases back into place instead of teleporting', () => {
    predictor.initialize(mockServerSnake); // head at (500, 500)
    predictor.setInput(0, false, 6);
    predictor.step(0.1); // local prediction advances to ~(518, 500)

    const teleportedServerSnake: InterpolatedSnake = {
      ...mockServerSnake,
      head: { x: 1000, y: 1000, angle: 0 },
    };

    predictor.reconcileSnapshot(teleportedServerSnake, true);

    // The authoritative head is adopted immediately so future prediction
    // simulates from the correct position...
    expect(predictor.head.x).toBe(1000);
    expect(predictor.head.y).toBe(1000);

    // ...but the rendered/predicted position does NOT teleport there in the
    // same instant -- it should still read close to the pre-correction spot.
    const justAfter = predictor.getPredictedSnake();
    expect(justAfter.head.x).toBeLessThan(600);
    expect(justAfter.head.x).toBeGreaterThan(500);
    expect(justAfter.head.y).toBeLessThan(600);
    expect(justAfter.head.y).toBeGreaterThanOrEqual(500);

    // The fast decay (lambda=40) closes the visual gap within a short,
    // bounded window: after 100ms of simulated time it should have caught
    // up almost entirely.
    predictor.step(0.1);
    const afterCatchUp = predictor.getPredictedSnake();
    expect(afterCatchUp.head.x).toBeGreaterThan(950);
    expect(afterCatchUp.head.y).toBeGreaterThan(950);
  });

  it('should support boost speed scaling and minimum mass requirement', () => {
    // When mass > 3.0 (e.g. 5.0), boost is allowed
    predictor.initialize({ ...mockServerSnake, mass: 5.0 });
    predictor.setInput(0, true, 4);

    expect(predictor.boost).toBe(true);
    expect(predictor.getSpeed()).toBe(LocalPredictor.BOOST_SPEED);

    // When mass <= 3.0 (minimum spawn size), boost is blocked
    predictor.initialize({ ...mockServerSnake, mass: 3.0 });
    predictor.setInput(0, true, 5);
    expect(predictor.boost).toBe(false);
    expect(predictor.getSpeed()).toBe(LocalPredictor.BASE_SPEED);
  });
});
