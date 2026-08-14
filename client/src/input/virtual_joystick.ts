/**
 * Dynamic Floating Virtual Joystick for Mobile & Tablet touchscreens.
 * Uses PointerEvents to support seamless multi-touch (movement + dedicated boost button).
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
  private _radius: number = 60.0; // max knob travel radius

  private _boostActive: boolean = false;
  private _boostPointerId: number | null = null;

  constructor(radius: number = 60.0) {
    this._radius = radius;
  }

  public handlePointerDown(pointerId: number, x: number, y: number, isBoostZone: boolean = false): boolean {
    if (isBoostZone) {
      this._boostActive = true;
      this._boostPointerId = pointerId;
      return true;
    }

    if (!this._active) {
      this._active = true;
      this._pointerId = pointerId;
      this._baseX = x;
      this._baseY = y;
      this._knobX = x;
      this._knobY = y;
      return true;
    }

    return false;
  }

  public handlePointerMove(pointerId: number, x: number, y: number): void {
    if (this._active && this._pointerId === pointerId) {
      const dx = x - this._baseX;
      const dy = y - this._baseY;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.001) {
        this._angle = Math.atan2(dy, dx);
        const clampedDist = Math.min(dist, this._radius);
        this._knobX = this._baseX + Math.cos(this._angle) * clampedDist;
        this._knobY = this._baseY + Math.sin(this._angle) * clampedDist;
      } else {
        this._knobX = this._baseX;
        this._knobY = this._baseY;
      }
    }
  }

  public handlePointerUp(pointerId: number): void {
    if (this._active && this._pointerId === pointerId) {
      this._active = false;
      this._pointerId = null;
      this._knobX = this._baseX;
      this._knobY = this._baseY;
    }

    if (this._boostActive && this._boostPointerId === pointerId) {
      this._boostActive = false;
      this._boostPointerId = null;
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
    this._boostActive = boost;
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
