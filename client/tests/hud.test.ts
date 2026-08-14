/**
 * Comprehensive unit tests for HUDManager UI overlays, leaderboard, stats, modals, and skin selector.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HUDManager } from '../src/ui/hud';
import { InterpolatedWorld } from '../src/net/interpolator';

class MockHTMLElement {
  public id: string = '';
  public className: string = '';
  public innerHTML: string = '';
  public textContent: string = '';
  public value: string = '';
  public dataset: Record<string, string> = {};
  public children: MockHTMLElement[] = [];
  public classList = {
    _classes: new Set<string>(),
    add: (c: string) => this.classList._classes.add(c),
    remove: (c: string) => this.classList._classes.delete(c),
    contains: (c: string) => this.classList._classes.has(c),
  };
  private _listeners: Record<string, Array<(e: any) => void>> = {};

  addEventListener(event: string, cb: (e: any) => void): void {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
  }

  dispatchEvent(event: any): boolean {
    const listeners = this._listeners[event.type || event] || [];
    for (const l of listeners) {
      l(event);
    }
    return true;
  }

  appendChild(child: MockHTMLElement): MockHTMLElement {
    this.children.push(child);
    return child;
  }
}

describe('HUDManager UI Components', () => {
  let mockContainer: any;
  let elementMap: Map<string, any>;
  let skinButtons: MockHTMLElement[];

  beforeEach(() => {
    elementMap = new Map();
    skinButtons = [
      Object.assign(new MockHTMLElement(), { dataset: { skin: 'neon_cyan' } }),
      Object.assign(new MockHTMLElement(), { dataset: { skin: 'cyber_magenta' } }),
      Object.assign(new MockHTMLElement(), { dataset: { skin: 'hyper_rainbow' } }),
    ];

    const mockDoc = {
      body: new MockHTMLElement(),
      createElement: (_tag: string) => {
        const el = new MockHTMLElement();
        return el;
      },
      getElementById: (id: string) => {
        if (!elementMap.has(id)) {
          const el = new MockHTMLElement();
          el.id = id;
          elementMap.set(id, el);
        }
        return elementMap.get(id);
      },
      querySelectorAll: (sel: string) => {
        if (sel === '.skin-opt') {
          return skinButtons;
        }
        return [];
      },
    };

    (globalThis as any).document = mockDoc;
    mockContainer = new MockHTMLElement();
  });

  it('should initialize and create lobby, game over, stats, leaderboard, and skins', () => {
    const hud = new HUDManager(mockContainer);
    expect(hud).toBeDefined();

    hud.showLobby();
    hud.hideLobby();

    hud.showGameOver({
      type: 'PLAYER_DEATH',
      killerId: 'k1',
      killerName: 'Nemesis',
      finalScore: 1250,
      mass: 55.0,
    });
    hud.hideGameOver();

    // Game over with boundary death
    hud.showGameOver({
      type: 'PLAYER_DEATH',
      killerId: null,
      killerName: null,
      finalScore: 0,
      mass: 10.0,
    });
  });

  it('should handle skin button clicks and selection', () => {
    const hud = new HUDManager(mockContainer);
    expect(hud).toBeDefined();

    // Click on cyber_magenta skin
    skinButtons[1].dispatchEvent({ type: 'click' });
    expect(skinButtons[1].classList.contains('active')).toBe(true);
    expect(skinButtons[0].classList.contains('active')).toBe(false);

    // Click on hyper_rainbow skin
    skinButtons[2].dispatchEvent({ type: 'click' });
    expect(skinButtons[2].classList.contains('active')).toBe(true);
    expect(skinButtons[1].classList.contains('active')).toBe(false);
  });

  it('should update leaderboard and player stats correctly', () => {
    const hud = new HUDManager(mockContainer);

    const world: InterpolatedWorld = {
      tick: 10,
      snakes: [
        {
          id: 'local-1',
          nickname: 'Hero',
          skin: 'neon_cyan',
          head: { x: 500, y: 500, angle: 0 },
          body: [],
          mass: 35.5,
          alive: true,
          score: 355,
          boost: false,
        },
      ],
      foods: [],
      leaderboard: [
        { id: 'local-1', nickname: 'Hero', score: 355, rank: 1 },
        { id: 'bot-2', nickname: '<Script>Bot</Script>', score: 200, rank: 2 },
      ],
    };

    hud.updateHUD(world, 'local-1');

    const scoreEl = document.getElementById('stat-score');
    const massEl = document.getElementById('stat-mass');
    const rankEl = document.getElementById('stat-rank');

    expect(scoreEl?.textContent).toBe('355');
    expect(massEl?.textContent).toBe('35.5');
    expect(rankEl?.textContent).toBe('#1');

    // Update with unknown player id
    hud.updateHUD(world, 'unknown-id');
  });

  it('should trigger onPlayClick and onRespawnClick callbacks', () => {
    const hud = new HUDManager(mockContainer);

    let played = false;
    let respawned = false;

    hud.onPlayClick = (nick, _skin) => {
      played = true;
      expect(nick).toBeDefined();
    };
    hud.onRespawnClick = () => {
      respawned = true;
    };

    // Simulate play click
    const playBtn = document.getElementById('play-btn');
    if (playBtn) playBtn.dispatchEvent({ type: 'click' } as unknown as Event);
    expect(played).toBe(true);

    // Simulate respawn click
    const respawnBtn = document.getElementById('respawn-btn');
    if (respawnBtn) respawnBtn.dispatchEvent({ type: 'click' } as unknown as Event);
    expect(respawned).toBe(true);
  });
});
