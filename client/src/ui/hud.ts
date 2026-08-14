/**
 * HUD & UI Overlay Manager (Lobby, Leaderboard, Score/Mass, Game Over, Skin Selection).
 */

import { InterpolatedWorld } from '../net/interpolator';
import { PlayerDeathPayload } from '../net/ws_client';
import { SKINS } from '../render/renderer';

export class HUDManager {
  private _container: HTMLElement;
  private _lobbyEl: HTMLElement;
  private _gameOverEl: HTMLElement;

  public onPlayClick: ((nickname: string, skin: string) => void) | null = null;
  public onRespawnClick: (() => void) | null = null;

  private _selectedSkin: string = 'neon_cyan';

  constructor(container: HTMLElement = document.body) {
    this._container = container;
    this._lobbyEl = document.getElementById('lobby-overlay') || this._createLobby();
    this._gameOverEl = document.getElementById('game-over-modal') || this._createGameOver();
    this._createLeaderboard();
    this._createStats();

    this._bindEvents();
  }

  private _createLobby(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'lobby-overlay';
    el.className = 'ui-overlay';
    
    // Unique list of skins excluding legacy duplicate keys
    const skinKeys = [
      'neon_cyan',
      'cyber_magenta',
      'toxic_lime',
      'solar_flare',
      'hyper_rainbow',
      'galaxy_void',
      'sunset_vapor',
      'lava_magma',
      'ice_frost',
      'toxic_hazard',
      'bubblegum',
      'matrix_code',
    ];

    el.innerHTML = `
      <div class="lobby-card">
        <h1 class="game-title">🐍 Snake Royale</h1>
        <p class="subtitle">Multiplayer Battle Royale Arena (10+ Players)</p>
        
        <div class="form-group">
          <label for="nickname-input">Choose Nickname</label>
          <input type="text" id="nickname-input" maxlength="16" placeholder="Enter your nickname..." value="Viper${Math.floor(Math.random() * 900 + 100)}" />
        </div>

        <div class="form-group">
          <label>Select Skin (${skinKeys.length} Mixed & Patterned Styles)</label>
          <div class="skin-selector" id="skin-selector">
            ${skinKeys
              .map((k) => {
                const s = SKINS[k] || SKINS.neon_cyan;
                return `
              <button class="skin-opt ${k === 'neon_cyan' ? 'active' : ''}" data-skin="${k}" title="${s.name}">
                <span class="skin-swatch" style="background: linear-gradient(135deg, ${s.bodyStart} 0%, ${s.bodyEnd} 100%); box-shadow: 0 0 6px ${s.glow}"></span>
                <span class="skin-label">${s.name}</span>
              </button>
            `;
              })
              .join('')}
          </div>
        </div>

        <button id="play-btn" class="primary-btn">ENTER ARENA</button>

        <div class="controls-hint">
          <span>🖥️ <b>PC:</b> Mouse / WASD + Space / Left-Click (Turbo > 3.0 Mass)</span>
          <span>📱 <b>Mobile / Tablet:</b> Drag + Double-Tap & Hold (Turbo)</span>
        </div>
      </div>
    `;
    this._container.appendChild(el);
    return el;
  }

  private _createGameOver(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'game-over-modal';
    el.className = 'ui-modal hidden';
    el.innerHTML = `
      <div class="modal-card">
        <h2 class="eliminated-title">💀 ELIMINATED</h2>
        <p id="killer-text" class="modal-sub">Defeated by Arena Boundary</p>
        <div class="modal-stats">
          <div class="stat-item">
            <span class="stat-lbl">Final Score</span>
            <span id="final-score-val" class="stat-val">0</span>
          </div>
        </div>
        <button id="respawn-btn" class="primary-btn">RESPAWN NOW</button>
      </div>
    `;
    this._container.appendChild(el);
    return el;
  }

  private _createLeaderboard(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'leaderboard-card';
    el.className = 'hud-card leaderboard-box';
    el.innerHTML = `
      <div class="card-header">🏆 TOP VIPERS</div>
      <div id="leaderboard-entries" class="leaderboard-list"></div>
    `;
    this._container.appendChild(el);
    return el;
  }

  private _createStats(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'stats-card';
    el.className = 'hud-card stats-box';
    el.innerHTML = `
      <div class="stat-row"><span>SCORE:</span> <b id="stat-score">0</b></div>
      <div class="stat-row"><span>MASS:</span> <b id="stat-mass">3.0</b></div>
      <div class="stat-row"><span>RANK:</span> <b id="stat-rank">#--</b></div>
    `;
    this._container.appendChild(el);
    return el;
  }

  private _bindEvents(): void {
    const playBtn = document.getElementById('play-btn');
    const nickInput = document.getElementById('nickname-input') as HTMLInputElement;
    const respawnBtn = document.getElementById('respawn-btn');
    const skinButtons = document.querySelectorAll('.skin-opt');

    skinButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        skinButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this._selectedSkin = (btn as HTMLElement).dataset.skin || 'neon_cyan';
      });
    });

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        const name = nickInput ? nickInput.value.trim() || 'Viper' : 'Viper';
        this.hideLobby();
        if (this.onPlayClick) this.onPlayClick(name, this._selectedSkin);
      });
    }

    if (respawnBtn) {
      respawnBtn.addEventListener('click', () => {
        this.hideGameOver();
        if (this.onRespawnClick) this.onRespawnClick();
      });
    }
  }

  public showLobby(): void {
    this._lobbyEl.classList.remove('hidden');
  }

  public hideLobby(): void {
    this._lobbyEl.classList.add('hidden');
  }

  public showGameOver(death: PlayerDeathPayload): void {
    const killerTxt = document.getElementById('killer-text');
    const scoreVal = document.getElementById('final-score-val');
    if (killerTxt) {
      killerTxt.textContent = death.killerName
        ? `Defeated by ${death.killerName}`
        : `Defeated by Arena Boundary`;
    }
    if (scoreVal) {
      scoreVal.textContent = death.finalScore.toLocaleString();
    }
    this._gameOverEl.classList.remove('hidden');
  }

  public hideGameOver(): void {
    this._gameOverEl.classList.add('hidden');
  }

  public updateHUD(world: InterpolatedWorld, localPlayerId: string | null): void {
    // 1. Update Leaderboard
    const listEl = document.getElementById('leaderboard-entries');
    if (listEl && world.leaderboard) {
      listEl.innerHTML = world.leaderboard
        .slice(0, 10)
        .map((entry) => {
          const isLocal = entry.id === localPlayerId;
          return `
          <div class="leaderboard-item ${isLocal ? 'highlight' : ''}">
            <span class="rank">#${entry.rank}</span>
            <span class="name">${this._escape(entry.nickname)}</span>
            <span class="score">${entry.score.toLocaleString()}</span>
          </div>
        `;
        })
        .join('');
    }

    // 2. Update Local Stats
    if (localPlayerId) {
      const localSnake = world.snakes.find((s) => s.id === localPlayerId);
      const scoreEl = document.getElementById('stat-score');
      const massEl = document.getElementById('stat-mass');
      const rankEl = document.getElementById('stat-rank');

      if (localSnake) {
        if (scoreEl) scoreEl.textContent = localSnake.score.toLocaleString();
        if (massEl) massEl.textContent = localSnake.mass.toFixed(1);
        const myRank = world.leaderboard.find((l) => l.id === localPlayerId);
        if (rankEl) rankEl.textContent = myRank ? `#${myRank.rank}` : '#--';
      }
    }
  }

  private _escape(str: string): string {
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
