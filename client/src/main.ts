/**
 * Client Application Entry Point.
 * Coordinates Instant Reflex input handling, Client-Side Prediction (CSP),
 * Adaptive LERP interpolation, Canvas 2D rendering, and HUD UI.
 */

import { Camera } from './render/camera';
import { GameRenderer } from './render/renderer';
import { HUDManager } from './ui/hud';
import { WebSocketClient, PlayerDeathPayload } from './net/ws_client';
import { EntityInterpolator } from './net/interpolator';
import { LocalPredictor } from './net/local_predictor';
import { DesktopController } from './input/desktop_controller';
import { VirtualJoystick } from './input/virtual_joystick';

class SnakeRoyaleApp {
  private _canvas: HTMLCanvasElement;
  private _camera: Camera;
  private _renderer: GameRenderer;
  private _hud: HUDManager;
  private _wsClient: WebSocketClient;
  private _interpolator: EntityInterpolator;
  private _localPredictor: LocalPredictor;
  private _desktopController: DesktopController;
  private _virtualJoystick: VirtualJoystick;

  private _isPlaying: boolean = false;
  private _localPlayerId: string | null = null;
  private _lastInputSendTime: number = 0;
  private _lastFrameTimeMs: number = 0;
  private _inputSendIntervalMs: number = 33.33; // 30 Hz steady heartbeat stream
  private _inputSeq: number = 0;

  constructor() {
    this._canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this._camera = new Camera(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    this._renderer = new GameRenderer(this._canvas, this._camera);
    this._hud = new HUDManager();
    this._wsClient = new WebSocketClient();
    this._interpolator = new EntityInterpolator();
    this._localPredictor = new LocalPredictor();
    this._desktopController = new DesktopController();
    this._virtualJoystick = new VirtualJoystick(65.0);

    this._setupResize();
    this._setupNetwork();
    this._setupInputListeners();
    this._setupUI();

    // Start render loop
    requestAnimationFrame((t) => this._gameLoop(t));
  }

  private _setupResize(): void {
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      this._canvas.width = width * dpr;
      this._canvas.height = height * dpr;
      this._canvas.style.width = `${width}px`;
      this._canvas.style.height = `${height}px`;

      const ctx = this._canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      this._camera.updateDimensions(width, height, dpr);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
  }

  private _setupNetwork(): void {
    this._wsClient.onJoinAck = (ack) => {
      this._localPlayerId = ack.playerId;
      this._renderer.arenaWidth = ack.arenaWidth;
      this._renderer.arenaHeight = ack.arenaHeight;
      this._isPlaying = true;
      this._localPredictor.reset();
    };

    this._wsClient.onSnapshot = (snapshot) => {
      const now = performance.now();
      this._interpolator.pushSnapshot(snapshot, now);

      if (this._localPlayerId) {
        const localServerSnake = snapshot.snakes.find((s) => s.id === this._localPlayerId);
        if (localServerSnake) {
          this._localPredictor.reconcileSnapshot(localServerSnake);
        }
      }
    };

    this._wsClient.onDeath = (death: PlayerDeathPayload) => {
      this._isPlaying = false;
      this._localPredictor.alive = false;
      this._hud.showGameOver(death);
    };
  }

  private _sendCurrentInput(): void {
    if (!this._isPlaying || !this._wsClient.isConnected) {
      return;
    }

    let angle = this._desktopController.getAngle();
    let boost = this._desktopController.isBoost();

    if (this._virtualJoystick.isActive()) {
      angle = this._virtualJoystick.getAngle();
    }
    if (this._virtualJoystick.isBoost()) {
      boost = true;
    }

    this._inputSeq++;
    this._localPredictor.setInput(angle, boost, this._inputSeq);
    this._wsClient.sendInput(angle, boost, this._inputSeq);
  }

  private _setupInputListeners(): void {
    // Instant Reflex Event Handlers (Dispatches on significant direction changes < 1ms)
    this._desktopController.onInputChange = () => {
      this._sendCurrentInput();
    };

    this._virtualJoystick.onInputChange = () => {
      this._sendCurrentInput();
    };

    // Touch & Pointer Events on Canvas for dynamic floating joystick
    this._canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      // Exclude pointer if it originates from mobile turbo button
      if (e.clientX > window.innerWidth - 120 && e.clientY > window.innerHeight - 120) {
        return;
      }
      this._virtualJoystick.handlePointerDown(e.pointerId, e.clientX, e.clientY);
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
      this._virtualJoystick.handlePointerMove(e.pointerId, e.clientX, e.clientY);
    });

    const endPointer = (e: PointerEvent) => {
      this._virtualJoystick.handlePointerUp(e.pointerId);
    };

    window.addEventListener('pointerup', endPointer);
    window.addEventListener('pointercancel', endPointer);

    // Track mouse aim relative to screen center
    window.addEventListener('mousemove', (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      this._desktopController.setMousePosition(e.clientX, e.clientY, cx, cy);
    });
  }

  private _setupUI(): void {
    this._hud.onPlayClick = async (nickname, skin) => {
      if (!this._wsClient.isConnected) {
        try {
          await this._wsClient.connect();
        } catch (e) {
          console.error('Failed to connect to server:', e);
          alert('Could not connect to game server. Ensure backend is running.');
          this._hud.showLobby();
          return;
        }
      }
      this._wsClient.sendJoin(nickname, skin);
    };

    this._hud.onRespawnClick = () => {
      this._localPredictor.reset();
      this._wsClient.sendRespawn();
      this._isPlaying = true;
    };

    this._hud.onMobileBoostChange = (active) => {
      this._virtualJoystick.setBoost(active);
    };
  }

  private _gameLoop(currentTimeMs: number): void {
    if (this._lastFrameTimeMs === 0) {
      this._lastFrameTimeMs = currentTimeMs;
    }
    const dt = Math.min(0.1, Math.max(0.001, (currentTimeMs - this._lastFrameTimeMs) / 1000.0));
    this._lastFrameTimeMs = currentTimeMs;

    // 1. Process continuous input heartbeat (30-40 Hz)
    if (this._isPlaying && this._wsClient.isConnected) {
      if (currentTimeMs - this._lastInputSendTime >= this._inputSendIntervalMs) {
        this._lastInputSendTime = currentTimeMs;
        this._sendCurrentInput();
      }

      // 2. Advance local kinematics predictor at display frame rate (60-120 FPS)
      this._localPredictor.step(dt);
    }

    // 3. Compute interpolated world state for remote entities
    const worldState = this._interpolator.getInterpolatedState(currentTimeMs);

    // 4. Render Canvas 2D with zero-lag local predicted entity
    const joystickState = this._virtualJoystick.getRenderState();
    const localPredictedSnake =
      this._isPlaying && this._localPredictor.isInitialized()
        ? this._localPredictor.getPredictedSnake()
        : null;

    this._renderer.render(worldState, this._localPlayerId, joystickState, localPredictedSnake);

    // 5. Update HUD
    if (worldState) {
      this._hud.updateHUD(worldState, this._localPlayerId);
    }

    requestAnimationFrame((t) => this._gameLoop(t));
  }
}

// Instantiate game on DOM loaded
window.addEventListener('DOMContentLoaded', () => {
  new SnakeRoyaleApp();
});
