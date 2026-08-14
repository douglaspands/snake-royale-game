/**
 * Touch and Pointer Event Simulator for virtual joystick and responsive multi-touch testing.
 */

export interface SyntheticPointerEventInit {
  pointerId?: number;
  pointerType?: string;
  clientX: number;
  clientY: number;
  isPrimary?: boolean;
  button?: number;
  buttons?: number;
}

export class TouchSimulator {
  private _target: EventTarget;

  constructor(target: EventTarget) {
    this._target = target;
  }

  createPointerEvent(type: string, init: SyntheticPointerEventInit): any {
    const event = {
      type,
      pointerId: init.pointerId ?? 1,
      pointerType: init.pointerType ?? 'touch',
      clientX: init.clientX,
      clientY: init.clientY,
      isPrimary: init.isPrimary ?? true,
      button: init.button ?? 0,
      buttons: init.buttons ?? (type === 'pointerup' ? 0 : 1),
      preventDefault: () => {},
      stopPropagation: () => {},
    };
    return event;
  }

  pointerDown(init: SyntheticPointerEventInit): void {
    const evt = this.createPointerEvent('pointerdown', init);
    this._target.dispatchEvent(evt as unknown as Event);
  }

  pointerMove(init: SyntheticPointerEventInit): void {
    const evt = this.createPointerEvent('pointermove', init);
    this._target.dispatchEvent(evt as unknown as Event);
  }

  pointerUp(init: SyntheticPointerEventInit): void {
    const evt = this.createPointerEvent('pointerup', init);
    this._target.dispatchEvent(evt as unknown as Event);
  }

  pointerCancel(init: SyntheticPointerEventInit): void {
    const evt = this.createPointerEvent('pointercancel', init);
    this._target.dispatchEvent(evt as unknown as Event);
  }

  simulateJoystickDrag(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    steps: number = 5,
    pointerId: number = 1
  ): void {
    this.pointerDown({ clientX: startX, clientY: startY, pointerId });
    for (let i = 1; i <= steps; i++) {
      const alpha = i / steps;
      const curX = startX + (endX - startX) * alpha;
      const curY = startY + (endY - startY) * alpha;
      this.pointerMove({ clientX: curX, clientY: curY, pointerId });
    }
  }

  releaseJoystick(x: number, y: number, pointerId: number = 1): void {
    this.pointerUp({ clientX: x, clientY: y, pointerId });
  }
}
