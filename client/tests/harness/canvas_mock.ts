/**
 * Canvas 2D & requestAnimationFrame Mock for headless, deterministic frontend testing.
 */

export interface DrawCall {
  method: string;
  args: any[];
}

export class MockCanvasRenderingContext2D {
  public drawCalls: DrawCall[] = [];
  public fillStyle: string | CanvasGradient | CanvasPattern = '#000000';
  public strokeStyle: string | CanvasGradient | CanvasPattern = '#000000';
  public lineWidth: number = 1;
  public lineCap: CanvasLineCap = 'butt';
  public lineJoin: CanvasLineJoin = 'miter';
  public globalAlpha: number = 1.0;
  public font: string = '10px sans-serif';
  public textAlign: CanvasTextAlign = 'start';
  public textBaseline: CanvasTextBaseline = 'alphabetic';
  public shadowBlur: number = 0;
  public shadowColor: string = 'rgba(0, 0, 0, 0)';

  private record(method: string, ...args: any[]) {
    this.drawCalls.push({ method, args });
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    this.record('clearRect', x, y, w, h);
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    this.record('fillRect', x, y, w, h);
  }

  strokeRect(x: number, y: number, w: number, h: number): void {
    this.record('strokeRect', x, y, w, h);
  }

  rect(x: number, y: number, w: number, h: number): void {
    this.record('rect', x, y, w, h);
  }

  roundRect(x: number, y: number, w: number, h: number, radii?: number | number[]): void {
    this.record('roundRect', x, y, w, h, radii);
  }

  beginPath(): void {
    this.record('beginPath');
  }

  closePath(): void {
    this.record('closePath');
  }

  moveTo(x: number, y: number): void {
    this.record('moveTo', x, y);
  }

  lineTo(x: number, y: number): void {
    this.record('lineTo', x, y);
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    this.record('arc', x, y, radius, startAngle, endAngle, counterclockwise);
  }

  fill(): void {
    this.record('fill');
  }

  stroke(): void {
    this.record('stroke');
  }

  save(): void {
    this.record('save');
  }

  restore(): void {
    this.record('restore');
  }

  translate(x: number, y: number): void {
    this.record('translate', x, y);
  }

  scale(x: number, y: number): void {
    this.record('scale', x, y);
  }

  rotate(angle: number): void {
    this.record('rotate', angle);
  }

  fillText(text: string, x: number, y: number, maxWidth?: number): void {
    this.record('fillText', text, x, y, maxWidth);
  }

  strokeText(text: string, x: number, y: number, maxWidth?: number): void {
    this.record('strokeText', text, x, y, maxWidth);
  }

  measureText(text: string): { width: number } {
    this.record('measureText', text);
    return { width: text.length * 7 };
  }

  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): any {
    this.record('createRadialGradient', x0, y0, r0, x1, y1, r1);
    return {
      addColorStop: (offset: number, color: string) => {
        this.record('addColorStop', offset, color);
      },
    };
  }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number): any {
    this.record('createLinearGradient', x0, y0, x1, y1);
    return {
      addColorStop: (offset: number, color: string) => {
        this.record('addColorStop', offset, color);
      },
    };
  }

  clearHistory(): void {
    this.drawCalls = [];
  }

  countCalls(methodName: string): number {
    return this.drawCalls.filter((c) => c.method === methodName).length;
  }
}

export class MockCanvasElement {
  public width: number = 800;
  public height: number = 600;
  public style: Record<string, string> = {};
  public context: MockCanvasRenderingContext2D = new MockCanvasRenderingContext2D();

  getContext(contextId: string): any {
    if (contextId === '2d') {
      return this.context;
    }
    return null;
  }

  getBoundingClientRect(): { left: number; top: number; width: number; height: number; right: number; bottom: number } {
    return {
      left: 0,
      top: 0,
      width: this.width,
      height: this.height,
      right: this.width,
      bottom: this.height,
    };
  }
}

export class MockAnimationClock {
  private _callbacks: Map<number, (time: number) => void> = new Map();
  private _nextId: number = 1;
  public currentTime: number = 0;

  requestAnimationFrame(cb: (time: number) => void): number {
    const id = this._nextId++;
    this._callbacks.set(id, cb);
    return id;
  }

  cancelAnimationFrame(id: number): void {
    this._callbacks.delete(id);
  }

  step(dtMs: number = 16.666): void {
    this.currentTime += dtMs;
    const callbacksToRun = Array.from(this._callbacks.values());
    this._callbacks.clear();
    for (const cb of callbacksToRun) {
      cb(this.currentTime);
    }
  }
}
