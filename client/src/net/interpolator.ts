/**
 * LERP Entity Interpolator with Snapshot Ring Buffer for smooth 60-120 FPS rendering.
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

export class EntityInterpolator {
  private _buffer: WorldSnapshotPayload[] = [];
  private _maxBufferSize: number = 20;
  public interpolationDelayMs: number = 100.0; // 100ms render buffer

  public pushSnapshot(snapshot: WorldSnapshotPayload): void {
    // Keep sorted by timestamp
    this._buffer.push(snapshot);
    if (this._buffer.length > this._maxBufferSize) {
      this._buffer.shift();
    }
  }

  public clear(): void {
    this._buffer = [];
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

  public getInterpolatedState(clientNowMs: number): InterpolatedWorld | null {
    if (this._buffer.length === 0) {
      return null;
    }

    if (this._buffer.length === 1) {
      const s = this._buffer[0];
      return {
        tick: s.tick,
        snakes: s.snakes.map((snk) => ({ ...snk })),
        foods: s.foods,
        leaderboard: s.leaderboard,
      };
    }

    // Compute target render time
    const renderTime = clientNowMs - this.interpolationDelayMs;

    // Find surrounding snapshots
    let s0: WorldSnapshotPayload = this._buffer[0];
    let s1: WorldSnapshotPayload = this._buffer[this._buffer.length - 1];

    if (renderTime <= s0.timestamp) {
      // Behind oldest snapshot -> return oldest
      return {
        tick: s0.tick,
        snakes: s0.snakes.map((snk) => ({ ...snk })),
        foods: s0.foods,
        leaderboard: s0.leaderboard,
      };
    }

    if (renderTime >= s1.timestamp) {
      // Ahead of newest snapshot -> extrapolate or return newest
      return {
        tick: s1.tick,
        snakes: s1.snakes.map((snk) => ({ ...snk })),
        foods: s1.foods,
        leaderboard: s1.leaderboard,
      };
    }

    // Locate the two framing snapshots
    for (let i = 0; i < this._buffer.length - 1; i++) {
      if (this._buffer[i].timestamp <= renderTime && renderTime <= this._buffer[i + 1].timestamp) {
        s0 = this._buffer[i];
        s1 = this._buffer[i + 1];
        break;
      }
    }

    const span = s1.timestamp - s0.timestamp;
    const alpha = span > 0 ? (renderTime - s0.timestamp) / span : 0;
    const clampedAlpha = Math.max(0, Math.min(1, alpha));

    // Interpolate snakes
    const interpolatedSnakes: InterpolatedSnake[] = [];
    const snakeMap0 = new Map<string, SnakeSnapshotData>(s0.snakes.map((s) => [s.id, s]));

    for (const snake1 of s1.snakes) {
      const snake0 = snakeMap0.get(snake1.id);
      if (!snake0) {
        interpolatedSnakes.push({ ...snake1 });
        continue;
      }

      // Interpolate Head
      const headX = this._lerp(snake0.head.x, snake1.head.x, clampedAlpha);
      const headY = this._lerp(snake0.head.y, snake1.head.y, clampedAlpha);
      const headAngle = this._lerpAngle(snake0.head.angle, snake1.head.angle, clampedAlpha);

      // Interpolate Body Segments
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
