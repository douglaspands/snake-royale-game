/**
 * Desktop Controller handling Mouse and Keyboard (WASD/Arrows + Space Turbo).
 */

export class DesktopController {
  private _angle: number = 0.0;
  private _boost: boolean = false;
  private _keysDown: Set<string> = new Set();
  private _useKeyboard: boolean = false;
  private _targetElement: HTMLElement | Window | null = null;

  constructor(target?: HTMLElement | Window | null) {
    this._targetElement = target ?? (typeof window !== 'undefined' ? window : null);
    if (typeof window !== 'undefined' || this._targetElement) {
      this._bindEvents();
    }
  }

  private _bindEvents(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this._keysDown.add(e.code);
      if (e.code === 'Space') {
        this._boost = true;
      }
      this._updateKeyboardAngle();
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this._keysDown.delete(e.code);
      if (e.code === 'Space') {
        this._boost = false;
      }
      this._updateKeyboardAngle();
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this._useKeyboard) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        this._angle = Math.atan2(e.clientY - cy, e.clientX - cx);
      }
    });

    window.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 0) { // Left click = turbo
        this._boost = true;
      }
    });

    window.addEventListener('mouseup', (e: MouseEvent) => {
      if (e.button === 0) {
        this._boost = false;
      }
    });
  }

  public setMousePosition(screenX: number, screenY: number, centerX: number, centerY: number): void {
    this._useKeyboard = false;
    this._angle = Math.atan2(screenY - centerY, screenX - centerX);
  }

  private _updateKeyboardAngle(): void {
    let dx = 0;
    let dy = 0;

    if (this._keysDown.has('KeyW') || this._keysDown.has('ArrowUp')) dy -= 1;
    if (this._keysDown.has('KeyS') || this._keysDown.has('ArrowDown')) dy += 1;
    if (this._keysDown.has('KeyA') || this._keysDown.has('ArrowLeft')) dx -= 1;
    if (this._keysDown.has('KeyD') || this._keysDown.has('ArrowRight')) dx += 1;

    if (dx !== 0 || dy !== 0) {
      this._useKeyboard = true;
      this._angle = Math.atan2(dy, dx);
    }
  }

  public getAngle(): number {
    return this._angle;
  }

  public isBoost(): boolean {
    return this._boost;
  }

  public setBoost(boost: boolean): void {
    this._boost = boost;
  }
}
