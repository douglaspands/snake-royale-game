/**
 * Packet Generator for simulating real-time network streams with jitter and latency variations.
 */

export interface SnakeSnapshotData {
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

export interface FoodSnapshotData {
  id: number;
  x: number;
  y: number;
  val: number;
  type: 'normal' | 'boost_drop' | 'corpse';
}

export interface WorldSnapshotPayload {
  type: 'WORLD_SNAPSHOT';
  tick: number;
  timestamp: number;
  snakes: SnakeSnapshotData[];
  foods: FoodSnapshotData[];
  leaderboard: Array<{ id: string; nickname: string; score: number; rank: number }>;
}

export class PacketGenerator {
  static createLinearSnake(
    id: string = 'player-1',
    x: number = 500,
    y: number = 500,
    angle: number = 0,
    segmentCount: number = 10,
    spacing: number = 8
  ): SnakeSnapshotData {
    const body: Array<{ x: number; y: number }> = [];
    for (let i = 1; i <= segmentCount; i++) {
      body.push({
        x: x - i * spacing * Math.cos(angle),
        y: y - i * spacing * Math.sin(angle),
      });
    }

    return {
      id,
      nickname: 'HeroViper',
      skin: 'neon_blue',
      head: { x, y, angle },
      body,
      mass: 10 + segmentCount,
      alive: true,
      score: 100 + segmentCount * 10,
      boost: false,
    };
  }

  static createSnapshot(
    tick: number,
    timestamp: number,
    snakes?: SnakeSnapshotData[],
    foods?: FoodSnapshotData[]
  ): WorldSnapshotPayload {
    const snakeList = snakes ?? [this.createLinearSnake()];
    const foodList = foods ?? [
      { id: 1, x: 200, y: 200, val: 1.0, type: 'normal' },
      { id: 2, x: 400, y: 400, val: 1.2, type: 'boost_drop' },
    ];

    const leaderboard = snakeList
      .slice()
      .sort((a, b) => b.score - a.score)
      .map((s, idx) => ({
        id: s.id,
        nickname: s.nickname,
        score: s.score,
        rank: idx + 1,
      }));

    return {
      type: 'WORLD_SNAPSHOT',
      tick,
      timestamp,
      snakes: snakeList,
      foods: foodList,
      leaderboard,
    };
  }

  static generateMovingStream(
    initialX: number = 100,
    initialY: number = 100,
    vx: number = 180, // px per second
    vy: number = 0,
    tickCount: number = 30,
    intervalMs: number = 33.33,
    jitterMs: number = 0
  ): WorldSnapshotPayload[] {
    const stream: WorldSnapshotPayload[] = [];
    let curX = initialX;
    let curY = initialY;
    const angle = Math.atan2(vy, vx);

    for (let i = 0; i < tickCount; i++) {
      const dtSec = intervalMs / 1000;
      curX += vx * dtSec;
      curY += vy * dtSec;
      const jitter = jitterMs > 0 ? (Math.random() * 2 - 1) * jitterMs : 0;
      const timestamp = i * intervalMs + jitter;

      const snake = this.createLinearSnake('test-snake', curX, curY, angle);
      stream.push(this.createSnapshot(i + 1, timestamp, [snake]));
    }

    return stream;
  }

  /**
   * Simulates a server stall (e.g. an Android GC pause / JVM-ART CPU contention spike):
   * one large inter-arrival gap of `durationMs`, followed by `resumeCount` snapshots
   * resuming at the normal `intervalMs` cadence. Positions continue moving linearly at
   * (vx, vy) across the stall so post-stall bursts can be checked for jump discontinuities.
   *
   * Returns arrival-time-tagged snapshots (`{ snapshot, clientArrivalMs }`) rather than a
   * bare stream, since the stall's defining feature is its client arrival-time gap.
   */
  static injectStall(
    durationMs: number,
    startClientMs: number = 0,
    initialX: number = 100,
    initialY: number = 100,
    vx: number = 180, // px per second
    vy: number = 0,
    resumeCount: number = 10,
    intervalMs: number = 33.33
  ): Array<{ snapshot: WorldSnapshotPayload; clientArrivalMs: number }> {
    const angle = Math.atan2(vy, vx);
    const dtStallSec = durationMs / 1000;

    let curX = initialX;
    let curY = initialY;
    let clientTime = startClientMs;
    let tick = 1;

    const out: Array<{ snapshot: WorldSnapshotPayload; clientArrivalMs: number }> = [];

    // Snapshot immediately before the stall.
    out.push({
      snapshot: this.createSnapshot(tick++, clientTime, [this.createLinearSnake('test-snake', curX, curY, angle)]),
      clientArrivalMs: clientTime,
    });

    // The stall itself: world state keeps advancing server-side, but the client receives
    // nothing until the gap closes.
    curX += vx * dtStallSec;
    curY += vy * dtStallSec;
    clientTime += durationMs;
    out.push({
      snapshot: this.createSnapshot(tick++, clientTime, [this.createLinearSnake('test-snake', curX, curY, angle)]),
      clientArrivalMs: clientTime,
    });

    // Resume normal-interval snapshots after the stall clears.
    for (let i = 0; i < resumeCount; i++) {
      const dtSec = intervalMs / 1000;
      curX += vx * dtSec;
      curY += vy * dtSec;
      clientTime += intervalMs;
      out.push({
        snapshot: this.createSnapshot(tick++, clientTime, [this.createLinearSnake('test-snake', curX, curY, angle)]),
        clientArrivalMs: clientTime,
      });
    }

    return out;
  }
}
