/**
 * Adaptive LERP Entity Interpolator with Jitter-Compensated Snapshot Ring Buffer.
 * Synchronizes client arrival clock to guarantee smooth 60-120 FPS remote entity motion without jitter.
 */

import { WorldSnapshotPayload, SnakeSnapshotData, FoodSnapshotData } from '../../tests/harness/packet_generator';

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

  public pushSnapshot(snapshot: WorldSnapshotPayload, clientNowMs?: number): void {
    const now = clientNowMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (this._lastPushClientTime > 0) {
      const delta = now - this._lastPushClientTime;
      if (delta > 0 && delta < 500) {
        this._deltaHistory.push(delta);
        if (this._deltaHistory.length > 12) {
          this._deltaHistory.shift();
        }
        if (this.adaptive) {
          this._recomputeAdaptiveDelay();
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

    // Target buffer = 1.1 * avg + 1.8 * jitter, clamped between 35ms and 65ms
    const target = Math.max(35.0, Math.min(65.0, avg * 1.1 + jitter * 1.8));
    // Smooth adaptive glide
    this.interpolationDelayMs = this.interpolationDelayMs * 0.92 + target * 0.08;
  }

  public clear(): void {
    this._buffer = [];
    this._deltaHistory = [];
    this._lastPushClientTime = 0;
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
      // Ahead of newest arrival -> return newest frame
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
