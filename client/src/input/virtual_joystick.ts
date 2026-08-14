/**
 * Dynamic Floating Virtual Joystick for Mobile & Tablet touchscreens.
 * Supports universal Double-Tap & Hold gesture for Turbo Boost, multi-touch boost,
 * micro-deadzone filtering, and instant event-driven dispatch.
 */

export interface JoystickRenderState {
  active: boolean;
  baseX: number;
  baseY: number;
  knobX: number;
  knobY: number;
  radius: number;
}

export class VirtualJoystick {
  private _active: boolean = false;
  private _pointerId: number | null = null;
  private _baseX: number = 0;
  private _baseY: number = 0;
  private _knobX: number = 0;
  private _knobY: number = 0;
  private _angle: number = 0;
  private _prevNotifiedAngle: number = 0;
  private _radius: number = 60.0; // max knob travel radius
  public deadzone: number = 4.0; // 4px circular deadzone to filter finger tremble

  private _boostActive: boolean = false;
  private _boostPointerId: number | null = null;
  private _lastTapTime: number = 0;
  public doubleTapWindowMs: number = 300.0;

  public onInputChange?: (angle: number, boost: boolean) => void;
  public angleThreshold: number = 0.015;

  constructor(radius: number = 60.0) {
    this._radius = radius;
  }

  public handlePointerDown(pointerId: number, x: number, y: number, isBoostZone: boolean = false): boolean {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const timeSinceLastTap = now - this._lastTapTime;

    // 1. Check for Double-Tap & Hold Gesture (2nd tap within 300ms held down)
    if ((this._lastTapTime > 0 && timeSinceLastTap <= this.doubleTapWindowMs) || isBoostZone) {
      this._boostActive = true;
      this._boostPointerId = pointerId;
    }
    this._lastTapTime = now;

    // 2. If primary joystick is already active and another touch lands -> secondary finger boost
    if (this._active && this._pointerId !== pointerId) {
      this._boostActive = true;
      this._boostPointerId = pointerId;
      this._notifyChange(true);
      return true;
    }

    // 3. Primary joystick acquisition
    if (!this._active) {
      this._active = true;
      this._pointerId = pointerId;
      this._baseX = x;
      this._baseY = y;
      this._knobX = x;
      this._knobY = y;
      this._notifyChange(true);
      return true;
    }

    return false;
  }

  public handlePointerMove(pointerId: number, x: number, y: number): void {
    if (this._active && this._pointerId === pointerId) {
      const dx = x - this._baseX;
      const dy = y - this._baseY;
      const dist = Math.hypot(dx, dy);

      if (dist > this.deadzone) {
        this._angle = Math.atan2(dy, dx);
        const clampedDist = Math.min(dist, this._radius);
        this._knobX = this._baseX + Math.cos(this._angle) * clampedDist;
        this._knobY = this._baseY + Math.sin(this._angle) * clampedDist;
        this._notifyChange(false);
      } else {
        this._knobX = this._baseX;
        this._knobY = this._baseY;
      }
    }
  }

  public handlePointerUp(pointerId: number): void {
    if (this._boostPointerId === pointerId || this._pointerId === pointerId) {
      if (this._boostActive) {
        this._boostActive = false;
        this._boostPointerId = null;
        this._notifyChange(true);
      }
    }

    if (this._active && this._pointerId === pointerId) {
      this._active = false;
      this._pointerId = null;
      this._knobX = this._baseX;
      this._knobY = this._baseY;
      this._notifyChange(true);
    }
  }

  private _notifyChange(force: boolean = false): void {
    const angleDiff = Math.abs(this._angle - this._prevNotifiedAngle);
    if (force || angleDiff >= this.angleThreshold) {
      this._prevNotifiedAngle = this._angle;
      if (this.onInputChange) {
        this.onInputChange(this._angle, this._boostActive);
      }
    }
  }

  public getAngle(): number {
    return this._angle;
  }

  public isActive(): boolean {
    return this._active;
  }

  public isBoost(): boolean {
    return this._boostActive;
  }

  public setBoost(boost: boolean): void {
    const changed = this._boostActive !== boost;
    this._boostActive = boost;
    if (changed) {
      this._notifyChange(true);
    }
  }

  public getRenderState(): JoystickRenderState {
    return {
      active: this._active,
      baseX: this._baseX,
      baseY: this._baseY,
      knobX: this._knobX,
      knobY: this._knobY,
      radius: this._radius,
    };
  }
}
