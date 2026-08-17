/**
 * Adaptive LERP Entity Interpolator with Jitter-Compensated Snapshot Ring Buffer.
 * Synchronizes client arrival clock to guarantee smooth 60-120 FPS remote entity motion without jitter.
 */

import { WorldSnapshotPayload, SnakeSnapshotData, FoodSnapshotData } from '../../tests/harness/packet_generator';

// Above this raw inter-arrival gap (or an incoming tickDurationMs signal, once the
// protocol carries one), a push is treated as a server stall rather than ordinary jitter.
const STALL_THRESHOLD_MS = 200;
// Adaptive delay clamp ceiling — wide enough to absorb an Android GC/CPU-contention stall.
const MAX_ADAPTIVE_DELAY_MS = 120;
// Number of subsequent pushes for which normal EMA glide is suppressed after a stall snap,
// so the buffer doesn't immediately erode the widened delay before jitter stats catch up.
const STALL_COOLDOWN_PUSHES = 3;
// Bounded horizon for extrapolating past the newest buffered snapshot before freezing.
const MAX_EXTRAPOLATION_MS = 100;

// The wire payload does not yet declare `tickDurationMs`; accept it defensively when present.
type SnapshotWithTickDuration = WorldSnapshotPayload & { tickDurationMs?: number };

export interface InterpolatedSnake {
  id: string;
  nickname: string;
  skin: string;
  head: { x: number; y: number; angle: number };
  body: Array<{ x: number; y: number }>;
  mass: number;
  alive: boolean;
  score: number;
  boost: boolean;
}

export interface InterpolatedWorld {
  tick: number;
  snakes: InterpolatedSnake[];
  foods: FoodSnapshotData[];
  leaderboard: Array<{ id: string; nickname: string; score: number; rank: number }>;
}

export interface BufferedSnapshot {
  snapshot: WorldSnapshotPayload;
  clientArrivalMs: number;
}

export class EntityInterpolator {
  private _buffer: BufferedSnapshot[] = [];
  private _maxBufferSize: number = 24;
  public interpolationDelayMs: number = 45.0; // Adaptive low-latency render buffer (35-50ms)
  public adaptive: boolean = true;
  private _lastPushClientTime: number = 0;
  private _deltaHistory: number[] = [];
  private _stallCooldownRemaining: number = 0;

  public pushSnapshot(snapshot: WorldSnapshotPayload, clientNowMs?: number): void {
    const now = clientNowMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (this._lastPushClientTime > 0) {
      const rawDelta = now - this._lastPushClientTime;
      if (rawDelta > 0) {
        // A stall still counts toward jitter stats, just clamped so it doesn't unboundedly
        // skew the mean/variance used by the adaptive-delay EMA.
        const clampedDelta = Math.min(rawDelta, 500);
        this._deltaHistory.push(clampedDelta);
        if (this._deltaHistory.length > 12) {
          this._deltaHistory.shift();
        }

        // tickDurationMs may not exist on the payload yet — fall back to the observed
        // client-side arrival gap when absent.
        const tickDurationMs = (snapshot as SnapshotWithTickDuration).tickDurationMs;
        const stallSignal = typeof tickDurationMs === 'number' ? tickDurationMs : rawDelta;

        if (stallSignal >= STALL_THRESHOLD_MS) {
          // Server stall detected: snap the buffer wide immediately instead of waiting for
          // the EMA to glide there, and hold it while a few more snapshots settle in.
          this.interpolationDelayMs = MAX_ADAPTIVE_DELAY_MS;
          this._stallCooldownRemaining = STALL_COOLDOWN_PUSHES;
        } else if (this.adaptive) {
          if (this._stallCooldownRemaining > 0) {
            this._stallCooldownRemaining--;
          } else {
            this._recomputeAdaptiveDelay();
          }
        }
      }
    }
    this._lastPushClientTime = now;

    // Buffer snapshot with its precise local arrival time
    this._buffer.push({ snapshot, clientArrivalMs: now });
    if (this._buffer.length > this._maxBufferSize) {
      this._buffer.shift();
    }
  }

  private _recomputeAdaptiveDelay(): void {
    if (this._deltaHistory.length < 3) return;
    const avg = this._deltaHistory.reduce((a, b) => a + b, 0) / this._deltaHistory.length;
    // Jitter calculation (std deviation of frame deltas)
    const variance =
      this._deltaHistory.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / this._deltaHistory.length;
    const jitter = Math.sqrt(variance);

    // Target buffer = 1.1 * avg + 1.8 * jitter, clamped between 35ms and 120ms
    const target = Math.max(35.0, Math.min(MAX_ADAPTIVE_DELAY_MS, avg * 1.1 + jitter * 1.8));
    // Smooth adaptive glide
    this.interpolationDelayMs = this.interpolationDelayMs * 0.92 + target * 0.08;
  }

  public clear(): void {
    this._buffer = [];
    this._deltaHistory = [];
    this._lastPushClientTime = 0;
    this._stallCooldownRemaining = 0;
  }

  public getSnapshotCount(): number {
    return this._buffer.length;
  }

  private _lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private _lerpAngle(a: number, b: number, t: number): number {
    let diff = (b - a) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  private _toInterpolatedWorld(s: WorldSnapshotPayload): InterpolatedWorld {
    return {
      tick: s.tick,
      snakes: s.snakes.map((snk) => ({
        ...snk,
        body: snk.body.map((b) => ({ x: b.x, y: b.y })),
      })),
      foods: s.foods,
      leaderboard: s.leaderboard,
    };
  }

  /**
   * Extrapolates entity motion beyond the newest buffered snapshot using the velocity
   * derived from the two newest buffered snapshots, for up to MAX_EXTRAPOLATION_MS.
   */
  private _extrapolateWorld(bPrev: BufferedSnapshot, bNewest: BufferedSnapshot, extrapMs: number): InterpolatedWorld {
    const dt = bNewest.clientArrivalMs - bPrev.clientArrivalMs;
    const s0 = bPrev.snapshot;
    const s1 = bNewest.snapshot;
    const snakeMap0 = new Map<string, SnakeSnapshotData>(s0.snakes.map((s) => [s.id, s]));

    const extrapolatedSnakes: InterpolatedSnake[] = s1.snakes.map((snake1) => {
      const snake0 = snakeMap0.get(snake1.id);
      if (!snake0 || dt <= 0) {
        // No prior sample to derive velocity from -> hold last known state for this entity.
        return {
          ...snake1,
          body: snake1.body.map((b) => ({ x: b.x, y: b.y })),
        };
      }

      const headVx = (snake1.head.x - snake0.head.x) / dt;
      const headVy = (snake1.head.y - snake0.head.y) / dt;
      const headX = snake1.head.x + headVx * extrapMs;
      const headY = snake1.head.y + headVy * extrapMs;

      const body: Array<{ x: number; y: number }> = [];
      const segCount = Math.max(snake0.body.length, snake1.body.length);
      for (let j = 0; j < segCount; j++) {
        const seg0 = snake0.body[j] || snake0.body[snake0.body.length - 1] || snake0.head;
        const seg1 = snake1.body[j] || snake1.body[snake1.body.length - 1] || snake1.head;
        const segVx = (seg1.x - seg0.x) / dt;
        const segVy = (seg1.y - seg0.y) / dt;
        body.push({
          x: seg1.x + segVx * extrapMs,
          y: seg1.y + segVy * extrapMs,
        });
      }

      return {
        id: snake1.id,
        nickname: snake1.nickname,
        skin: snake1.skin,
        head: { x: headX, y: headY, angle: snake1.head.angle },
        body,
        mass: snake1.mass,
        alive: snake1.alive,
        score: snake1.score,
        boost: snake1.boost,
      };
    });

    return {
      tick: s1.tick,
      snakes: extrapolatedSnakes,
      foods: s1.foods,
      leaderboard: s1.leaderboard,
    };
  }

  public getInterpolatedState(clientNowMs: number): InterpolatedWorld | null {
    if (this._buffer.length === 0) {
      return null;
    }

    if (this._buffer.length === 1) {
      return this._toInterpolatedWorld(this._buffer[0].snapshot);
    }

    // Compute target render time in client local arrival epoch
    const renderTime = clientNowMs - this.interpolationDelayMs;

    const bOldest = this._buffer[0];
    const bNewest = this._buffer[this._buffer.length - 1];

    if (renderTime <= bOldest.clientArrivalMs) {
      // Behind oldest snapshot -> return oldest frame
      return this._toInterpolatedWorld(bOldest.snapshot);
    }

    if (renderTime >= bNewest.clientArrivalMs) {
      // Render clock has outrun the newest buffered snapshot. Bridge brief buffer
      // exhaustion (e.g. a stall not yet fully absorbed by the adaptive delay) by
      // extrapolating from last known velocity, bounded to avoid runaway drift.
      const overshootMs = renderTime - bNewest.clientArrivalMs;
      if (overshootMs <= MAX_EXTRAPOLATION_MS && this._buffer.length >= 2) {
        const bPrev = this._buffer[this._buffer.length - 2];
        return this._extrapolateWorld(bPrev, bNewest, overshootMs);
      }
      // Beyond the bounded extrapolation window -> freeze on newest frame
      return this._toInterpolatedWorld(bNewest.snapshot);
    }

    // Locate framing snapshot pair
    let b0 = bOldest;
    let b1 = bNewest;

    for (let i = 0; i < this._buffer.length - 1; i++) {
      if (this._buffer[i].clientArrivalMs <= renderTime && renderTime <= this._buffer[i + 1].clientArrivalMs) {
        b0 = this._buffer[i];
        b1 = this._buffer[i + 1];
        break;
      }
    }

    const span = b1.clientArrivalMs - b0.clientArrivalMs;
    const alpha = span > 0 ? (renderTime - b0.clientArrivalMs) / span : 0;
    const clampedAlpha = Math.max(0, Math.min(1, alpha));

    const s0 = b0.snapshot;
    const s1 = b1.snapshot;

    // Interpolate snakes
    const interpolatedSnakes: InterpolatedSnake[] = [];
    const snakeMap0 = new Map<string, SnakeSnapshotData>(s0.snakes.map((s) => [s.id, s]));

    for (const snake1 of s1.snakes) {
      const snake0 = snakeMap0.get(snake1.id);
      if (!snake0) {
        interpolatedSnakes.push({
          ...snake1,
          body: snake1.body.map((b) => ({ x: b.x, y: b.y })),
        });
        continue;
      }

      // Smooth Head LERP
      const headX = this._lerp(snake0.head.x, snake1.head.x, clampedAlpha);
      const headY = this._lerp(snake0.head.y, snake1.head.y, clampedAlpha);
      const headAngle = this._lerpAngle(snake0.head.angle, snake1.head.angle, clampedAlpha);

      // Smooth Segment LERP
      const body: Array<{ x: number; y: number }> = [];
      const segCount = Math.max(snake0.body.length, snake1.body.length);
      for (let j = 0; j < segCount; j++) {
        const seg0 = snake0.body[j] || snake0.body[snake0.body.length - 1] || snake0.head;
        const seg1 = snake1.body[j] || snake1.body[snake1.body.length - 1] || snake1.head;
        body.push({
          x: this._lerp(seg0.x, seg1.x, clampedAlpha),
          y: this._lerp(seg0.y, seg1.y, clampedAlpha),
        });
      }

      interpolatedSnakes.push({
        id: snake1.id,
        nickname: snake1.nickname,
        skin: snake1.skin,
        head: { x: headX, y: headY, angle: headAngle },
        body,
        mass: this._lerp(snake0.mass, snake1.mass, clampedAlpha),
        alive: snake1.alive,
        score: snake1.score,
        boost: snake1.boost,
      });
    }

    return {
      tick: s1.tick,
      snakes: interpolatedSnakes,
      foods: s1.foods,
      leaderboard: s1.leaderboard,
    };
  }
}
