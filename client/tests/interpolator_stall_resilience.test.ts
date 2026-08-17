import { describe, it, expect } from 'vitest';
import { EntityInterpolator } from '../src/net/interpolator';
import { PacketGenerator } from './harness/packet_generator';

/**
 * Covers REQ-PROTO-008 (Adaptive Interpolation Buffer Contract): Android server stalls
 * (GC pauses / JVM-ART CPU contention) must widen the adaptive render delay instead of
 * being excluded from jitter stats, and brief buffer exhaustion must be bridged with
 * bounded velocity-based extrapolation instead of an immediate freeze-then-warp.
 *
 * All time progression here is a virtual clock passed explicitly to pushSnapshot /
 * getInterpolatedState — no real setTimeout()/sleep is used anywhere in this file.
 */
describe('Entity Interpolator — stall & extrapolation resilience', () => {
  describe('Scenario: A long stall widens the adaptive buffer', () => {
    it('picks up a stall gap that the old [35,65]ms clamp could not represent', () => {
      const interpolator = new EntityInterpolator();
      const events = PacketGenerator.injectStall(300, 1000);

      for (const e of events) {
        interpolator.pushSnapshot(e.snapshot, e.clientArrivalMs);
      }

      // Previously the delay was clamped to a narrow [35, 65]ms band, so a stall was
      // invisible to the mechanism sizing the buffer. It must now grow well past that.
      expect(interpolator.interpolationDelayMs).toBeGreaterThan(65);
      expect(interpolator.interpolationDelayMs).toBeLessThanOrEqual(120);
    });

    it('includes gaps at/beyond the old 500ms exclusion threshold in the jitter measurement', () => {
      const interpolator = new EntityInterpolator();
      // 600ms was previously excluded outright (delta >= 500 was dropped from history).
      const events = PacketGenerator.injectStall(600, 1000);

      for (const e of events) {
        interpolator.pushSnapshot(e.snapshot, e.clientArrivalMs);
      }

      // Stall-cooldown path snaps the delay directly to the widened ceiling.
      expect(interpolator.interpolationDelayMs).toBe(120);
    });

    it('does not regress normal, jitter-free cadence back toward the old narrow ceiling', () => {
      const interpolator = new EntityInterpolator();
      let time = 1000;
      for (let i = 0; i < 5; i++) {
        time += 33.3;
        const snap = PacketGenerator.createSnapshot(i + 1, time);
        interpolator.pushSnapshot(snap, time);
      }

      expect(interpolator.interpolationDelayMs).toBeGreaterThanOrEqual(35.0);
      expect(interpolator.interpolationDelayMs).toBeLessThanOrEqual(60.0);
    });
  });

  describe('Scenario: Brief buffer exhaustion is bridged with extrapolation', () => {
    it('extrapolates from last known velocity instead of freezing when render clock briefly outruns the buffer', () => {
      const interpolator = new EntityInterpolator();
      interpolator.adaptive = false;
      interpolator.interpolationDelayMs = 0;

      const s0 = PacketGenerator.createSnapshot(1, 1000, [PacketGenerator.createLinearSnake('p-1', 100, 100, 0)]);
      const s1 = PacketGenerator.createSnapshot(2, 1033.33, [PacketGenerator.createLinearSnake('p-1', 106, 100, 0)]);
      interpolator.pushSnapshot(s0, 1000);
      interpolator.pushSnapshot(s1, 1033.33);

      const velocityPxPerMs = (106 - 100) / (1033.33 - 1000);
      const overshootMs = 50; // within the bounded MAX_EXTRAPOLATION_MS (100ms)

      const state = interpolator.getInterpolatedState(1033.33 + overshootMs);
      expect(state).not.toBeNull();

      const expectedX = 106 + velocityPxPerMs * overshootMs;
      const headX = state!.snakes[0].head.x;
      expect(headX).toBeCloseTo(expectedX, 1);
      // Must have actually moved past the newest raw snapshot (not an immediate freeze).
      expect(headX).toBeGreaterThan(106);
    });

    it('falls back to freezing on the newest frame once overshoot exceeds the bounded extrapolation window', () => {
      const interpolator = new EntityInterpolator();
      interpolator.adaptive = false;
      interpolator.interpolationDelayMs = 0;

      const s0 = PacketGenerator.createSnapshot(1, 1000, [PacketGenerator.createLinearSnake('p-1', 100, 100, 0)]);
      const s1 = PacketGenerator.createSnapshot(2, 1033.33, [PacketGenerator.createLinearSnake('p-1', 106, 100, 0)]);
      interpolator.pushSnapshot(s0, 1000);
      interpolator.pushSnapshot(s1, 1033.33);

      // 500ms overshoot is far beyond MAX_EXTRAPOLATION_MS (100ms).
      const state = interpolator.getInterpolatedState(1033.33 + 500);
      expect(state!.snakes[0].head.x).toBeCloseTo(106, 5);
    });

    it('holds a freshly-appeared entity at its last known position when it has no prior sample to derive velocity from', () => {
      const interpolator = new EntityInterpolator();
      interpolator.adaptive = false;
      interpolator.interpolationDelayMs = 0;

      const s0 = PacketGenerator.createSnapshot(1, 1000, [PacketGenerator.createLinearSnake('p-1', 100, 100, 0)]);
      // 'p-2' only appears in the newest snapshot (e.g. just spawned) — no prior sample.
      const s1 = PacketGenerator.createSnapshot(2, 1033.33, [
        PacketGenerator.createLinearSnake('p-1', 106, 100, 0),
        PacketGenerator.createLinearSnake('p-2', 300, 300, 0),
      ]);
      interpolator.pushSnapshot(s0, 1000);
      interpolator.pushSnapshot(s1, 1033.33);

      const state = interpolator.getInterpolatedState(1033.33 + 50); // within extrapolation window
      expect(state).not.toBeNull();

      const p1 = state!.snakes.find((s) => s.id === 'p-1')!;
      const p2 = state!.snakes.find((s) => s.id === 'p-2')!;

      // p-1 has a prior sample -> extrapolates forward.
      expect(p1.head.x).toBeGreaterThan(106);
      // p-2 has no prior sample -> held at its last known (newest) position, not extrapolated.
      expect(p2.head.x).toBeCloseTo(300, 5);
      expect(p2.head.y).toBeCloseTo(300, 5);
    });

    it('holds last known state (does not throw/extrapolate) when only a single snapshot has ever arrived', () => {
      const interpolator = new EntityInterpolator();
      const s0 = PacketGenerator.createSnapshot(1, 1000, [PacketGenerator.createLinearSnake('p-1', 100, 100, 0)]);
      interpolator.pushSnapshot(s0, 1000);

      const state = interpolator.getInterpolatedState(1200);
      expect(state).not.toBeNull();
      expect(state!.snakes[0].head.x).toBeCloseTo(100, 5);
    });
  });

  describe('Scenario: post-stall burst does not warp', () => {
    it('bridges a stall and the resulting post-stall burst without any single-frame jump exceeding a safe px/ms bound', () => {
      const interpolator = new EntityInterpolator();
      const vxPxPerMs = 180 / 1000; // 180 px/s, matches PacketGenerator's default stream velocity
      const intervalMs = 33.33;
      const BASE_T = 1000; // avoid t=0, which collides with the interpolator's "no prior push" sentinel

      // Continuous-motion timeline: warm-up cadence establishes velocity, then one stall
      // gap kept inside the bounded extrapolation window, then resumed normal cadence
      // (the "burst"). Position is a pure function of elapsed time throughout — this is
      // exactly the condition under which velocity-based extrapolation should be exact.
      const relTimestamps: number[] = [];
      for (let i = 0; i < 5; i++) relTimestamps.push(i * intervalMs);
      const stallStartRel = relTimestamps[relTimestamps.length - 1];
      const stallEndRel = stallStartRel + 100; // 100ms stall, kept within MAX_EXTRAPOLATION_MS headroom
      relTimestamps.push(stallEndRel);
      for (let i = 1; i <= 10; i++) relTimestamps.push(stallEndRel + i * intervalMs);

      const timestamps = relTimestamps.map((rel) => rel + BASE_T);
      const positionOf = (rel: number) => 100 + rel * vxPxPerMs;

      const MAX_PX_PER_MS = 0.4; // >2x true speed (0.18 px/ms); a warp jump would blow well past this

      let idx = 0;
      let prevX: number | null = null;
      let prevT: number | null = null;
      const lastT = timestamps[timestamps.length - 1];
      // Stop sampling within the bounded extrapolation window past the last real snapshot.
      // Running further would deliberately exercise the "no new data ever arrives again"
      // freeze-on-newest fallback (a separate, already-covered scenario: an unbounded gap
      // with no burst has to fall back to holding a known-safe position, which is a
      // legitimate one-time correction, not the "post-stall burst" case under test here).
      const sampleUntil = lastT + 60;

      for (let t = BASE_T; t <= sampleUntil; t += 16) {
        while (idx < timestamps.length && timestamps[idx] <= t) {
          const rel = relTimestamps[idx];
          const ts = timestamps[idx];
          const snap = PacketGenerator.createSnapshot(idx + 1, ts, [
            PacketGenerator.createLinearSnake('test-snake', positionOf(rel), 100, 0),
          ]);
          interpolator.pushSnapshot(snap, ts);
          idx++;
        }

        const state = interpolator.getInterpolatedState(t);
        if (state && state.snakes.length > 0) {
          const headX = state.snakes[0].head.x;
          if (prevX !== null && prevT !== null) {
            const dt = t - prevT;
            if (dt > 0) {
              const speed = Math.abs(headX - prevX) / dt;
              expect(speed).toBeLessThanOrEqual(MAX_PX_PER_MS);
            }
          }
          prevX = headX;
          prevT = t;
        }
      }

      // Sanity: the stream actually progressed (not stuck at the starting x for the whole run).
      expect(prevX).not.toBeNull();
      expect(prevX as number).toBeGreaterThan(120);
    });
  });
});
