/**
 * Client-Side Prediction (CSP) and Reconciliation Engine.
 * Simulates local snake kinematics at 60-120 FPS for instant (<16ms) command response,
 * and reconciles with authoritative server snapshots using exponential error decay (anti-snap).
 */

import { InterpolatedSnake } from './interpolator';

export interface UnackedInput {
  seq: number;
  angle: number;
  boost: boolean;
  dt: number;
  timestamp: number;
}

export class LocalPredictor {
  public static readonly BASE_SPEED: number = 180.0;
  public static readonly BOOST_SPEED: number = 360.0;
  public static readonly BASE_TURN_RATE: number = 9.8;
  public static readonly MIN_TURN_RATE: number = 5.2;
  public static readonly MIN_BOOST_MASS: number = 3.0;
  public static readonly BASE_SEGMENT_SPACING: number = 8.0;
  public static readonly BASE_SEGMENT_COUNT: number = 3;

  private _initialized: boolean = false;
  public id: string = '';
  public nickname: string = '';
  public skin: string = 'neon_blue';
  public head: { x: number; y: number; angle: number } = { x: 500, y: 500, angle: 0 };
  public body: Array<{ x: number; y: number }> = [];
  public mass: number = 3.0;
  public alive: boolean = true;
  public score: number = 30;
  public boost: boolean = false;
  public targetAngle: number = 0;

  // Smoothing offset for anti-snap reconciliation
  private _errorOffsetX: number = 0;
  private _errorOffsetY: number = 0;
  public static readonly BASE_ERROR_DECAY_RATE: number = 15.0;
  // Fast lambda reused for the post-stall eased catch-up (REQ-PROTO-009):
  // exp(-40 * dt) collapses the visual offset within a short bounded window
  // (~99% closed by ~115ms) instead of an instant teleport.
  public static readonly STALL_CATCHUP_DECAY_RATE: number = 40.0;
  public errorDecayRate: number = LocalPredictor.BASE_ERROR_DECAY_RATE; // lambda for exp decay

  private _inputBuffer: UnackedInput[] = [];
  public lastSeq: number = 0;

  public initialize(snake: InterpolatedSnake): void {
    this.id = snake.id;
    this.nickname = snake.nickname;
    this.skin = snake.skin;
    this.head = { x: snake.head.x, y: snake.head.y, angle: snake.head.angle };
    this.body = snake.body.map((seg) => ({ x: seg.x, y: seg.y }));
    this.mass = snake.mass;
    this.alive = snake.alive;
    this.score = snake.score;
    this.boost = snake.boost;
    this.targetAngle = snake.head.angle;
    this._errorOffsetX = 0;
    this._errorOffsetY = 0;
    this._inputBuffer = [];
    this._initialized = true;
  }

  public isInitialized(): boolean {
    return this._initialized;
  }

  public reset(): void {
    this._initialized = false;
    this._inputBuffer = [];
    this._errorOffsetX = 0;
    this._errorOffsetY = 0;
  }

  public getTurnRate(): number {
    const massExcess = Math.max(0, this.mass - LocalPredictor.MIN_BOOST_MASS);
    return (
      LocalPredictor.MIN_TURN_RATE +
      (LocalPredictor.BASE_TURN_RATE - LocalPredictor.MIN_TURN_RATE) / (1.0 + 0.015 * massExcess)
    );
  }

  public getSpeed(): number {
    if (this.boost && this.mass > LocalPredictor.MIN_BOOST_MASS) {
      return LocalPredictor.BOOST_SPEED;
    }
    return LocalPredictor.BASE_SPEED;
  }

  public setInput(targetAngle: number, boost: boolean, seq: number): void {
    this.targetAngle = targetAngle;
    this.boost = boost && this.mass > LocalPredictor.MIN_BOOST_MASS;
    this.lastSeq = seq;
  }

  public pushInputRecord(input: UnackedInput): void {
    this._inputBuffer.push(input);
    if (this._inputBuffer.length > 120) {
      this._inputBuffer.shift();
    }
  }

  public step(dt: number): void {
    if (!this._initialized || !this.alive || dt <= 0) {
      return;
    }

    // 1. Turn towards target angle with dynamic agility w(M)
    const maxTurn = this.getTurnRate() * dt;
    this.head.angle = this._stepAngle(this.head.angle, this.targetAngle, maxTurn);

    // 2. Advance head
    const speed = this.getSpeed();
    const dist = speed * dt;
    this.head.x += Math.cos(this.head.angle) * dist;
    this.head.y += Math.sin(this.head.angle) * dist;

    // 3. Update IK body segments
    this._updateBody();

    // 4. Decay error offset smoothly
    const decay = Math.exp(-this.errorDecayRate * dt);
    this._errorOffsetX *= decay;
    this._errorOffsetY *= decay;
  }

  private _updateBody(): void {
    const targetCount =
      LocalPredictor.BASE_SEGMENT_COUNT +
      Math.floor(Math.max(0, this.mass - LocalPredictor.MIN_BOOST_MASS) * 1.5);
    const newBody: Array<{ x: number; y: number }> = [];

    let prev = { x: this.head.x, y: this.head.y };
    for (let i = 0; i < targetCount; i++) {
      const curr = this.body[i] || prev;
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const d = Math.hypot(dx, dy);

      if (d > 0.0001) {
        const ratio = LocalPredictor.BASE_SEGMENT_SPACING / d;
        const segX = prev.x + dx * ratio;
        const segY = prev.y + dy * ratio;
        const seg = { x: segX, y: segY };
        newBody.push(seg);
        prev = seg;
      } else {
        const seg = {
          x: prev.x - LocalPredictor.BASE_SEGMENT_SPACING * Math.cos(this.head.angle),
          y: prev.y - LocalPredictor.BASE_SEGMENT_SPACING * Math.sin(this.head.angle),
        };
        newBody.push(seg);
        prev = seg;
      }
    }

    this.body = newBody;
  }

  /**
   * Reconciles the local prediction against an authoritative server snapshot.
   *
   * @param serverSnake authoritative snake state from the latest snapshot.
   * @param followedKnownStall REQ-PROTO-009: true when this snapshot arrived
   *   right after a known, flagged server-side stall (e.g. Android GC/JVM
   *   contention pause) was detected. Defaults to false, which preserves the
   *   original instant hard-snap behavior for any caller that doesn't pass it.
   */
  public reconcileSnapshot(
    serverSnake: InterpolatedSnake,
    followedKnownStall: boolean = false
  ): void {
    if (!this._initialized) {
      this.initialize(serverSnake);
      return;
    }

    this.alive = serverSnake.alive;
    this.mass = serverSnake.mass;
    this.score = serverSnake.score;

    if (!this.alive) {
      return;
    }

    // Measure spatial drift between local prediction and authoritative server
    const dx = serverSnake.head.x - this.head.x;
    const dy = serverSnake.head.y - this.head.y;
    const drift = Math.hypot(dx, dy);

    if (drift > 180.0 && followedKnownStall) {
      // Drift is large, but it's explained by a known/flagged server stall
      // rather than packet loss or a real desync. Snap the authoritative
      // state in immediately (so future prediction simulates from the
      // correct position), but leave the *visual* offset to catch up fast
      // instead of teleporting -- reuses the existing error-decay easing at
      // a much higher lambda so it resolves within a short bounded window.
      const preCorrectionX = this.head.x;
      const preCorrectionY = this.head.y;
      this.head.x = serverSnake.head.x;
      this.head.y = serverSnake.head.y;
      this.head.angle = serverSnake.head.angle;
      this.body = serverSnake.body.map((s) => ({ x: s.x, y: s.y }));
      this._errorOffsetX = preCorrectionX - this.head.x;
      this._errorOffsetY = preCorrectionY - this.head.y;
      this.errorDecayRate = LocalPredictor.STALL_CATCHUP_DECAY_RATE;
    } else if (drift > 180.0) {
      // Catastrophic desync (e.g. teleport or heavy lag spike) -> snap hard
      this.head.x = serverSnake.head.x;
      this.head.y = serverSnake.head.y;
      this.head.angle = serverSnake.head.angle;
      this.body = serverSnake.body.map((s) => ({ x: s.x, y: s.y }));
      this._errorOffsetX = 0;
      this._errorOffsetY = 0;
      this.errorDecayRate = LocalPredictor.BASE_ERROR_DECAY_RATE;
    } else if (drift >= 0.5) {
      // Smooth subtle error decay
      this.errorDecayRate = LocalPredictor.BASE_ERROR_DECAY_RATE;
      this._errorOffsetX = dx * 0.4;
      this._errorOffsetY = dy * 0.4;
      this.head.x += dx * 0.6;
      this.head.y += dy * 0.6;
    }
  }

  public getPredictedSnake(): InterpolatedSnake {
    return {
      id: this.id,
      nickname: this.nickname,
      skin: this.skin,
      head: {
        x: this.head.x + this._errorOffsetX,
        y: this.head.y + this._errorOffsetY,
        angle: this.head.angle,
      },
      body: this.body.map((s) => ({
        x: s.x + this._errorOffsetX,
        y: s.y + this._errorOffsetY,
      })),
      mass: this.mass,
      alive: this.alive,
      score: this.score,
      boost: this.boost,
    };
  }

  private _normalizeAngle(angle: number): number {
    let a = angle % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  private _stepAngle(current: number, target: number, maxStep: number): number {
    const diff = this._normalizeAngle(target - current);
    const clamped = Math.max(-maxStep, Math.min(maxStep, diff));
    return this._normalizeAngle(current + clamped);
  }
}
