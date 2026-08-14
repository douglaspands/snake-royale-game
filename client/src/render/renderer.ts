/**
 * High-performance Canvas 2D Renderer for Snake Battle Royale.
 * Renders snakes, dynamic skins, eyes, boost particles, glowing food, arena boundaries, minimap and virtual joystick.
 */

import { Camera } from './camera';
import { InterpolatedWorld, InterpolatedSnake } from '../net/interpolator';
import { JoystickRenderState } from '../input/virtual_joystick';

export interface SkinPalette {
  head: string;
  bodyStart: string;
  bodyEnd: string;
  outline: string;
  glow: string;
}

export const SKINS: Record<string, SkinPalette> = {
  neon_blue: {
    head: '#00f0ff',
    bodyStart: '#00d2ff',
    bodyEnd: '#0055ff',
    outline: '#002b80',
    glow: 'rgba(0, 240, 255, 0.4)',
  },
  cyber_pink: {
    head: '#ff007f',
    bodyStart: '#ff2d95',
    bodyEnd: '#8b00ff',
    outline: '#4a005a',
    glow: 'rgba(255, 0, 127, 0.4)',
  },
  toxic_green: {
    head: '#39ff14',
    bodyStart: '#20e010',
    bodyEnd: '#00aa55',
    outline: '#004d1a',
    glow: 'rgba(57, 255, 20, 0.4)',
  },
  solar_gold: {
    head: '#ffd700',
    bodyStart: '#ffaa00',
    bodyEnd: '#ff4500',
    outline: '#803300',
    glow: 'rgba(255, 215, 0, 0.4)',
  },
  classic: {
    head: '#00e676',
    bodyStart: '#00c853',
    bodyEnd: '#009688',
    outline: '#004d40',
    glow: 'rgba(0, 230, 118, 0.4)',
  },
};

export class GameRenderer {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _camera: Camera;
  public arenaWidth: number = 3000;
  public arenaHeight: number = 3000;

  constructor(canvas: HTMLCanvasElement, camera: Camera, arenaWidth: number = 3000, arenaHeight: number = 3000) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    this._camera = camera;
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
  }

  public render(
    world: InterpolatedWorld | null,
    localPlayerId: string | null,
    joystickState?: JoystickRenderState
  ): void {
    const ctx = this._ctx;
    const width = this._canvas.width / this._camera.dpr;
    const height = this._canvas.height / this._camera.dpr;

    // 1. Clear Screen
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, width, height);

    if (!world) {
      return;
    }

    // Find local player snake for camera tracking
    const localSnake = localPlayerId ? world.snakes.find((s) => s.id === localPlayerId) : null;
    if (localSnake && localSnake.alive) {
      this._camera.follow(localSnake.head.x, localSnake.head.y, true);
    }
    this._camera.update();

    // 2. Begin World Transform
    this._camera.applyTransform(ctx);

    // 3. Draw Arena Background & Boundaries
    this._drawArena(ctx);

    // 4. Draw Food Pellets
    this._drawFood(ctx, world.foods);

    // 5. Draw Snakes Bodies (Draw other snakes first, local snake on top)
    const sortedSnakes = [...world.snakes].sort((a, b) => {
      if (a.id === localPlayerId) return 1;
      if (b.id === localPlayerId) return -1;
      return a.mass - b.mass;
    });

    for (const snake of sortedSnakes) {
      if (snake.alive) {
        this._drawSnake(ctx, snake, snake.id === localPlayerId);
      }
    }

    // 6. Restore World Transform
    this._camera.restoreTransform(ctx);

    // 7. Draw Screen-Space Stabilized Nameplates (REQ-REND-001 / REQ-REND-003)
    this._drawNameplates(ctx, sortedSnakes, localPlayerId, width, height);

    // 8. Draw Minimap & Screen Overlays
    this._drawMinimap(ctx, world, localPlayerId, width, height);

    // 9. Draw Virtual Joystick if active on screen
    if (joystickState && joystickState.active) {
      this._drawJoystick(ctx, joystickState);
    }
  }

  private _drawArena(ctx: CanvasRenderingContext2D): void {
    const bounds = this._camera.getVisibleBounds(100);

    // Draw dark grid background
    ctx.fillStyle = '#0f1422';
    ctx.fillRect(0, 0, this.arenaWidth, this.arenaHeight);

    // Draw grid lines
    const gridSize = 60;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();

    const startX = Math.max(0, Math.floor(bounds.minX / gridSize) * gridSize);
    const endX = Math.min(this.arenaWidth, Math.ceil(bounds.maxX / gridSize) * gridSize);
    const startY = Math.max(0, Math.floor(bounds.minY / gridSize) * gridSize);
    const endY = Math.min(this.arenaHeight, Math.ceil(bounds.maxY / gridSize) * gridSize);

    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // Draw glowing Arena Border
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ff3366';
    ctx.shadowColor = '#ff3366';
    ctx.shadowBlur = 12;
    ctx.strokeRect(0, 0, this.arenaWidth, this.arenaHeight);
    ctx.shadowBlur = 0;
  }

  private _drawFood(ctx: CanvasRenderingContext2D, foods: InterpolatedWorld['foods']): void {
    const bounds = this._camera.getVisibleBounds(50);
    const time = Date.now() / 1000;

    for (const food of foods) {
      // Culling
      if (food.x < bounds.minX || food.x > bounds.maxX || food.y < bounds.minY || food.y > bounds.maxY) {
        continue;
      }

      const pulse = Math.sin(time * 4 + food.id) * 0.8 + 5.0;

      if (food.type === 'corpse') {
        // Glowing big corpse pellet
        ctx.fillStyle = '#ff00ff';
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(food.x, food.y, Math.max(4, food.val * 0.8 + pulse), 0, Math.PI * 2);
        ctx.fill();
      } else if (food.type === 'boost_drop') {
        // Bright boost spark
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(food.x, food.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Ambient Food
        ctx.fillStyle = '#ffaa00';
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(food.x, food.y, 4.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  }

  private _drawSnake(ctx: CanvasRenderingContext2D, snake: InterpolatedSnake, isLocal: boolean): void {
    const palette = SKINS[snake.skin] || SKINS.neon_blue;
    const headRadius = 14 + 0.8 * Math.sqrt(Math.max(1, snake.mass));
    const bodyRadius = 12 + 0.7 * Math.sqrt(Math.max(1, snake.mass));

    // 1. Draw Body Segments (from tail to head)
    const body = snake.body;
    for (let i = body.length - 1; i >= 0; i--) {
      const seg = body[i];
      const alpha = 1 - i / (body.length + 1);
      const segRadius = bodyRadius * (0.6 + 0.4 * alpha);

      ctx.fillStyle = i % 2 === 0 ? palette.bodyStart : palette.bodyEnd;
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(seg.x, seg.y, segRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 2. Draw Boost Glow / Particles if boosting
    if (snake.boost) {
      ctx.shadowColor = palette.head;
      ctx.shadowBlur = 15;
    }

    // 3. Draw Head
    ctx.fillStyle = palette.head;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = isLocal ? 3 : 2;

    ctx.beginPath();
    ctx.arc(snake.head.x, snake.head.y, headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. Draw Cute Eyes tracking heading angle
    const eyeOffsetAngle = 0.5;
    const eyeDist = headRadius * 0.6;
    const pupilDist = headRadius * 0.25;

    for (const sign of [-1, 1]) {
      const eyeAngle = snake.head.angle + sign * eyeOffsetAngle;
      const eyeX = snake.head.x + Math.cos(eyeAngle) * eyeDist;
      const eyeY = snake.head.y + Math.sin(eyeAngle) * eyeDist;

      // Eye White
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, headRadius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      const pupilX = eyeX + Math.cos(snake.head.angle) * pupilDist;
      const pupilY = eyeY + Math.sin(snake.head.angle) * pupilDist;
      ctx.fillStyle = '#0a0d14';
      ctx.beginPath();
      ctx.arc(pupilX, pupilY, headRadius * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private _drawNameplates(
    ctx: CanvasRenderingContext2D,
    snakes: InterpolatedSnake[],
    localPlayerId: string | null,
    screenWidth: number,
    screenHeight: number
  ): void {
    ctx.font = 'bold 11px "Inter", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const snake of snakes) {
      if (!snake.alive) continue;

      const isLocal = snake.id === localPlayerId;
      const headRadius = 14 + 0.8 * Math.sqrt(Math.max(1, snake.mass));
      const screenPos = this._camera.worldToScreen(snake.head.x, snake.head.y);

      // Frustum culling in screen space
      if (
        screenPos.x < -100 ||
        screenPos.x > screenWidth + 100 ||
        screenPos.y < -100 ||
        screenPos.y > screenHeight + 100
      ) {
        continue;
      }

      // Round to exact integer screen pixels to completely prevent font hinting jitter
      const nx = Math.round(screenPos.x);
      const ny = Math.round(screenPos.y - (headRadius + 14) * this._camera.zoom);

      // Measure text for pill container
      const textMetrics = ctx.measureText(snake.nickname);
      const textW = Math.round(textMetrics.width || 40);
      const pillW = textW + 16;
      const pillH = 20;
      const pillX = Math.round(nx - pillW / 2);
      const pillY = Math.round(ny - pillH / 2);

      // Draw Semi-transparent Pill Badge
      ctx.fillStyle = isLocal ? 'rgba(10, 24, 40, 0.85)' : 'rgba(10, 15, 26, 0.75)';
      ctx.strokeStyle = isLocal ? 'rgba(0, 240, 255, 0.8)' : 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(pillX, pillY, pillW, pillH, 6);
      } else {
        ctx.rect(pillX, pillY, pillW, pillH);
      }
      ctx.fill();
      ctx.stroke();

      // Draw Crisp Stabilized Text
      ctx.fillStyle = isLocal ? '#00f0ff' : '#ffffff';
      ctx.fillText(snake.nickname, nx, ny);
    }
  }

  private _drawMinimap(
    ctx: CanvasRenderingContext2D,
    world: InterpolatedWorld,
    localPlayerId: string | null,
    screenWidth: number,
    screenHeight: number
  ): void {
    const size = 130;
    const margin = 16;
    const miniX = screenWidth - size - margin;
    const miniY = screenHeight - size - margin;

    // Minimap Background
    ctx.fillStyle = 'rgba(10, 15, 26, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(miniX, miniY, size, size, 8) : ctx.rect(miniX, miniY, size, size);
    ctx.fill();
    ctx.stroke();

    // Scale factors
    const sx = size / this.arenaWidth;
    const sy = size / this.arenaHeight;

    // Draw snake blips on minimap
    for (const snake of world.snakes) {
      if (!snake.alive) continue;
      const isLocal = snake.id === localPlayerId;
      const px = miniX + snake.head.x * sx;
      const py = miniY + snake.head.y * sy;

      ctx.fillStyle = isLocal ? '#00f0ff' : '#ff4466';
      ctx.beginPath();
      ctx.arc(px, py, isLocal ? 3.5 : 2.0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private _drawJoystick(ctx: CanvasRenderingContext2D, state: JoystickRenderState): void {
    // Draw Base Ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(state.baseX, state.baseY, state.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw Knob
    ctx.fillStyle = 'rgba(0, 240, 255, 0.65)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(state.knobX, state.knobY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
