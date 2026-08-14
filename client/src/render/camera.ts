/**
 * Camera System with dynamic Retina DPI compensation, zoom, smooth follow LERP and coordinate transforms.
 */

export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class Camera {
  public x: number = 0;
  public y: number = 0;
  public targetX: number = 0;
  public targetY: number = 0;
  public zoom: number = 1.0;
  public viewportWidth: number = 800;
  public viewportHeight: number = 600;
  public dpr: number = 1.0;
  public smoothing: number = 0.15; // LERP damping factor

  constructor(viewportWidth: number = 800, viewportHeight: number = 600, dpr: number = 1.0) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.dpr = dpr;
    this.x = viewportWidth / 2;
    this.y = viewportHeight / 2;
    this.targetX = this.x;
    this.targetY = this.y;
  }

  public updateDimensions(width: number, height: number, dpr: number = 1.0): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.dpr = dpr;
  }

  public follow(targetX: number, targetY: number, snap: boolean = false): void {
    this.targetX = targetX;
    this.targetY = targetY;

    if (snap) {
      this.x = targetX;
      this.y = targetY;
    }
  }

  public update(dt: number = 0.016): void {
    // Smoothly interpolate towards target
    const factor = Math.min(1.0, this.smoothing * (dt / 0.016));
    this.x += (this.targetX - this.x) * factor;
    this.y += (this.targetY - this.y) * factor;
  }

  public worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const screenCenterX = this.viewportWidth / 2;
    const screenCenterY = this.viewportHeight / 2;
    const screenX = screenCenterX + (worldX - this.x) * this.zoom;
    const screenY = screenCenterY + (worldY - this.y) * this.zoom;
    return { x: screenX, y: screenY };
  }

  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const screenCenterX = this.viewportWidth / 2;
    const screenCenterY = this.viewportHeight / 2;
    const worldX = this.x + (screenX - screenCenterX) / this.zoom;
    const worldY = this.y + (screenY - screenCenterY) / this.zoom;
    return { x: worldX, y: worldY };
  }

  public getVisibleBounds(padding: number = 100): ViewportBounds {
    const halfW = (this.viewportWidth / 2) / this.zoom + padding;
    const halfH = (this.viewportHeight / 2) / this.zoom + padding;
    return {
      minX: this.x - halfW,
      minY: this.y - halfH,
      maxX: this.x + halfW,
      maxY: this.y + halfH,
    };
  }

  public applyTransform(ctx: CanvasRenderingContext2D): void {
    const screenCenterX = this.viewportWidth / 2;
    const screenCenterY = this.viewportHeight / 2;

    ctx.save();
    ctx.translate(screenCenterX, screenCenterY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  public restoreTransform(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }
}
