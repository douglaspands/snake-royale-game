/**
 * High-performance Canvas 2D Renderer for Snake Battle Royale.
 * Renders 12+ mixed/bicolor skins, tracking eyes, boost sparks, impact explosions,
 * glowing food, arena boundaries, minimap, and virtual joystick.
 */

import { Camera } from './camera';
import { InterpolatedWorld, InterpolatedSnake } from '../net/interpolator';
import { JoystickRenderState } from '../input/virtual_joystick';

export interface SkinPalette {
  name: string;
  head: string;
  bodyStart: string;
  bodyEnd: string;
  outline: string;
  glow: string;
  pattern: 'alternate' | 'gradient' | 'rainbow' | 'zebra';
}

export const SKINS: Record<string, SkinPalette> = {
  neon_cyan: {
    name: 'Neon Cyan',
    head: '#00f0ff',
    bodyStart: '#00f0ff',
    bodyEnd: '#0055ff',
    outline: '#002b80',
    glow: 'rgba(0, 240, 255, 0.4)',
    pattern: 'alternate',
  },
  cyber_magenta: {
    name: 'Cyber Magenta',
    head: '#ff007f',
    bodyStart: '#ff007f',
    bodyEnd: '#8b00ff',
    outline: '#4a005a',
    glow: 'rgba(255, 0, 127, 0.4)',
    pattern: 'alternate',
  },
  toxic_lime: {
    name: 'Toxic Lime',
    head: '#39ff14',
    bodyStart: '#39ff14',
    bodyEnd: '#00aa55',
    outline: '#004d1a',
    glow: 'rgba(57, 255, 20, 0.4)',
    pattern: 'alternate',
  },
  solar_flare: {
    name: 'Solar Flare',
    head: '#ffd700',
    bodyStart: '#ffaa00',
    bodyEnd: '#ff2200',
    outline: '#802000',
    glow: 'rgba(255, 215, 0, 0.4)',
    pattern: 'gradient',
  },
  hyper_rainbow: {
    name: 'Hyper Rainbow',
    head: '#ffffff',
    bodyStart: '#ff0055',
    bodyEnd: '#00ffff',
    outline: '#222222',
    glow: 'rgba(255, 255, 255, 0.5)',
    pattern: 'rainbow',
  },
  galaxy_void: {
    name: 'Galaxy Void',
    head: '#9d00ff',
    bodyStart: '#6b00b6',
    bodyEnd: '#0d001a',
    outline: '#3d0066',
    glow: 'rgba(157, 0, 255, 0.4)',
    pattern: 'alternate',
  },
  sunset_vapor: {
    name: 'Sunset Vapor',
    head: '#ff6b6b',
    bodyStart: '#ffa07a',
    bodyEnd: '#9b59b6',
    outline: '#5b2c6f',
    glow: 'rgba(255, 107, 107, 0.4)',
    pattern: 'alternate',
  },
  lava_magma: {
    name: 'Lava Magma',
    head: '#ff3300',
    bodyStart: '#ff5500',
    bodyEnd: '#1a0500',
    outline: '#4d0000',
    glow: 'rgba(255, 51, 0, 0.4)',
    pattern: 'alternate',
  },
  ice_frost: {
    name: 'Ice Frost',
    head: '#ffffff',
    bodyStart: '#a8ffeb',
    bodyEnd: '#00b4d8',
    outline: '#005f73',
    glow: 'rgba(168, 255, 235, 0.4)',
    pattern: 'alternate',
  },
  toxic_hazard: {
    name: 'Toxic Hazard',
    head: '#ffcc00',
    bodyStart: '#ffcc00',
    bodyEnd: '#111111',
    outline: '#222222',
    glow: 'rgba(255, 204, 0, 0.4)',
    pattern: 'zebra',
  },
  bubblegum: {
    name: 'Bubblegum',
    head: '#ff99c8',
    bodyStart: '#ff99c8',
    bodyEnd: '#a9def9',
    outline: '#d45087',
    glow: 'rgba(255, 153, 200, 0.4)',
    pattern: 'alternate',
  },
  matrix_code: {
    name: 'Matrix Code',
    head: '#00ff66',
    bodyStart: '#00ff66',
    bodyEnd: '#002200',
    outline: '#003311',
    glow: 'rgba(0, 255, 102, 0.4)',
    pattern: 'alternate',
  },
  // Legacy aliases
  neon_blue: {
    name: 'Neon Blue',
    head: '#00f0ff',
    bodyStart: '#00f0ff',
    bodyEnd: '#0055ff',
    outline: '#002b80',
    glow: 'rgba(0, 240, 255, 0.4)',
    pattern: 'alternate',
  },
  cyber_pink: {
    name: 'Cyber Pink',
    head: '#ff007f',
    bodyStart: '#ff007f',
    bodyEnd: '#8b00ff',
    outline: '#4a005a',
    glow: 'rgba(255, 0, 127, 0.4)',
    pattern: 'alternate',
  },
  toxic_green: {
    name: 'Toxic Green',
    head: '#39ff14',
    bodyStart: '#39ff14',
    bodyEnd: '#00aa55',
    outline: '#004d1a',
    glow: 'rgba(57, 255, 20, 0.4)',
    pattern: 'alternate',
  },
  solar_gold: {
    name: 'Solar Gold',
    head: '#ffd700',
    bodyStart: '#ffaa00',
    bodyEnd: '#ff2200',
    outline: '#802000',
    glow: 'rgba(255, 215, 0, 0.4)',
    pattern: 'gradient',
  },
  classic: {
    name: 'Classic Green',
    head: '#00e676',
    bodyStart: '#00c853',
    bodyEnd: '#009688',
    outline: '#004d40',
    glow: 'rgba(0, 230, 118, 0.4)',
    pattern: 'alternate',
  },
};

export interface ImpactParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  decay: number;
}

export class GameRenderer {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _camera: Camera;
  public arenaWidth: number = 3000;
  public arenaHeight: number = 3000;
  private _particles: ImpactParticle[] = [];

  constructor(canvas: HTMLCanvasElement, camera: Camera, arenaWidth: number = 3000, arenaHeight: number = 3000) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    this._camera = camera;
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
  }

  public spawnExplosion(x: number, y: number, color: string = '#ff007f', count: number = 24): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 180 + 40;
      this._particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: Math.random() * 3.5 + 2.0,
        alpha: 1.0,
        decay: Math.random() * 1.8 + 1.2,
      });
    }
  }

  public render(
    world: InterpolatedWorld | null,
    localPlayerId: string | null,
    joystickState?: JoystickRenderState,
    localPredictedSnake?: InterpolatedSnake | null
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

    // Prioritize local predicted snake for zero-lag camera tracking and rendering
    const localSnake =
      (localPredictedSnake && localPredictedSnake.alive ? localPredictedSnake : null) ??
      (localPlayerId ? world.snakes.find((s) => s.id === localPlayerId) : null);

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
    const remoteSnakes = world.snakes.filter((s) => s.id !== localPlayerId);
    const allSnakes = localSnake && localSnake.alive ? [...remoteSnakes, localSnake] : remoteSnakes;

    const sortedSnakes = allSnakes.sort((a, b) => {
      if (a.id === localPlayerId) return 1;
      if (b.id === localPlayerId) return -1;
      return a.mass - b.mass;
    });

    for (const snake of sortedSnakes) {
      if (snake.alive) {
        this._drawSnake(ctx, snake, snake.id === localPlayerId);
      }
    }

    // 6. Draw Impact / Elimination Particles in World Space
    this._drawParticles(ctx, 0.016);

    // 7. Restore World Transform
    this._camera.restoreTransform(ctx);

    // 8. Draw Screen-Space Stabilized Nameplates
    this._drawNameplates(ctx, sortedSnakes, localPlayerId, width, height);

    // 9. Draw Minimap & Screen Overlays
    this._drawMinimap(ctx, world, localPlayerId, width, height);

    // 10. Draw Virtual Joystick if active on screen
    if (joystickState && joystickState.active) {
      this._drawJoystick(ctx, joystickState);
    }
  }

  private _drawParticles(ctx: CanvasRenderingContext2D, dt: number): void {
    if (this._particles.length === 0) return;

    const aliveParticles: ImpactParticle[] = [];
    for (const p of this._particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;

      if (p.alpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        aliveParticles.push(p);
      }
    }
    this._particles = aliveParticles;
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

    // Draw prominent boundary perimeter (REQ-PHYS-001)
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 15;
    ctx.strokeRect(0, 0, this.arenaWidth, this.arenaHeight);
    ctx.shadowBlur = 0;
  }

  private _drawFood(ctx: CanvasRenderingContext2D, foods: InterpolatedWorld['foods']): void {
    const bounds = this._camera.getVisibleBounds(20);
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const pulse = Math.sin(now * 0.005) * 1.5;

    for (const food of foods) {
      // Frustum culling
      if (food.x < bounds.minX || food.x > bounds.maxX || food.y < bounds.minY || food.y > bounds.maxY) {
        continue;
      }

      if (food.type === 'corpse') {
        // High-value glowing corpse pellet
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
    const palette = SKINS[snake.skin] || SKINS.neon_cyan;
    const headRadius = 14 + 0.8 * Math.sqrt(Math.max(1, snake.mass));
    const bodyRadius = 12 + 0.7 * Math.sqrt(Math.max(1, snake.mass));

    // 1. Draw Body Segments (from tail to head)
    const body = snake.body;
    for (let i = body.length - 1; i >= 0; i--) {
      const seg = body[i];
      const alpha = 1 - i / (body.length + 1);
      const segRadius = bodyRadius * (0.65 + 0.35 * alpha);

      // Apply pattern logic
      if (palette.pattern === 'rainbow') {
        const hue = (i * 28 + (typeof performance !== 'undefined' ? performance.now() * 0.08 : 0)) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 55%)`;
      } else if (palette.pattern === 'zebra') {
        ctx.fillStyle = i % 2 === 0 ? palette.bodyStart : palette.bodyEnd;
      } else {
        // Bicolor / alternating pattern
        ctx.fillStyle = i % 2 === 0 ? palette.bodyStart : palette.bodyEnd;
      }

      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(seg.x, seg.y, segRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 2. Draw Boost Glow if boosting
    if (snake.boost) {
      ctx.shadowColor = palette.head;
      ctx.shadowBlur = 18;
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
      if (screenPos.x < -100 || screenPos.x > screenWidth + 100 || screenPos.y < -100 || screenPos.y > screenHeight + 100) {
        continue;
      }

      // Exact Integer Pixel Alignment (REQ-REND-003)
      const nx = Math.round(screenPos.x);
      const ny = Math.round(screenPos.y - headRadius * this._camera.zoom - 16);

      const label = snake.nickname || 'Viper';
      const scoreText = `${snake.score.toLocaleString()} pts`;
      const textWidth = Math.max(ctx.measureText(label).width, ctx.measureText(scoreText).width) + 16;

      // Background pill
      ctx.fillStyle = isLocal ? 'rgba(0, 240, 255, 0.25)' : 'rgba(10, 13, 20, 0.75)';
      ctx.strokeStyle = isLocal ? 'rgba(0, 240, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.roundRect(nx - textWidth / 2, ny - 10, textWidth, 20, 10);
      ctx.fill();
      ctx.stroke();

      // Nickname text
      ctx.fillStyle = isLocal ? '#00f0ff' : '#ffffff';
      ctx.fillText(label, nx, ny);
    }
  }

  private _drawMinimap(
    ctx: CanvasRenderingContext2D,
    world: InterpolatedWorld,
    localPlayerId: string | null,
    screenWidth: number,
    _screenHeight: number
  ): void {
    const mapSize = Math.min(130, screenWidth * 0.22);
    const padding = 16;
    const mapX = screenWidth - mapSize - padding;
    const mapY = padding;

    // Minimap Background
    ctx.fillStyle = 'rgba(10, 13, 20, 0.8)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(mapX, mapY, mapSize, mapSize, 8);
    ctx.fill();
    ctx.stroke();

    const scaleX = mapSize / this.arenaWidth;
    const scaleY = mapSize / this.arenaHeight;

    // Draw other snakes on minimap
    for (const snake of world.snakes) {
      if (!snake.alive) continue;
      const isLocal = snake.id === localPlayerId;
      const smX = mapX + snake.head.x * scaleX;
      const smY = mapY + snake.head.y * scaleY;

      ctx.fillStyle = isLocal ? '#00f0ff' : '#ff0055';
      ctx.beginPath();
      ctx.arc(smX, smY, isLocal ? 3.5 : 2.0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private _drawJoystick(ctx: CanvasRenderingContext2D, state: JoystickRenderState): void {
    // Outer Base Ring
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(state.baseX, state.baseY, state.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner Active Knob
    ctx.fillStyle = 'rgba(0, 240, 255, 0.85)';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.arc(state.knobX, state.knobY, state.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
