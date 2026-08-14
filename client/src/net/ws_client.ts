/**
 * WebSocket Network Client with automatic reconnect and event dispatching.
 */

import { WorldSnapshotPayload } from '../../tests/harness/packet_generator';

export interface JoinAckPayload {
  type: 'JOIN_ACK';
  playerId: string;
  arenaWidth: number;
  arenaHeight: number;
  tickRate: number;
}

export interface PlayerDeathPayload {
  type: 'PLAYER_DEATH';
  killerId: string | null;
  killerName: string | null;
  finalScore: number;
  mass: number;
}

export type MessageHandler<T> = (data: T) => void;

export class WebSocketClient {
  private _ws: WebSocket | null = null;
  private _url: string;
  private _seq: number = 0;
  public isConnected: boolean = false;
  public playerId: string | null = null;

  public onJoinAck: MessageHandler<JoinAckPayload> | null = null;
  public onSnapshot: MessageHandler<WorldSnapshotPayload> | null = null;
  public onDeath: MessageHandler<PlayerDeathPayload> | null = null;
  public onDisconnect: (() => void) | null = null;

  constructor(url?: string) {
    if (url) {
      this._url = url;
    } else if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host || 'localhost:8000';
      this._url = `${protocol}//${host}/ws`;
    } else {
      this._url = 'ws://localhost:8000/ws';
    }
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this._ws = new WebSocket(this._url);

        this._ws.onopen = () => {
          this.isConnected = true;
          resolve();
        };

        this._ws.onclose = () => {
          this.isConnected = false;
          if (this.onDisconnect) this.onDisconnect();
        };

        this._ws.onerror = (err) => {
          this.isConnected = false;
          reject(err);
        };

        this._ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            this._handleIncomingPacket(data);
          } catch (e) {
            console.error('Failed to parse incoming WS message:', e);
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private _handleIncomingPacket(data: any): void {
    if (data.type === 'JOIN_ACK') {
      this.playerId = data.playerId;
      if (this.onJoinAck) this.onJoinAck(data as JoinAckPayload);
    } else if (data.type === 'WORLD_SNAPSHOT') {
      if (this.onSnapshot) this.onSnapshot(data as WorldSnapshotPayload);
    } else if (data.type === 'PLAYER_DEATH') {
      if (this.onDeath) this.onDeath(data as PlayerDeathPayload);
    }
  }

  public sendJoin(nickname: string, skin: string): void {
    if (this._ws && this.isConnected) {
      this._ws.send(JSON.stringify({ type: 'JOIN', nickname, skin }));
    }
  }

  public sendInput(angle: number, boost: boolean): void {
    if (this._ws && this.isConnected) {
      this._seq++;
      this._ws.send(JSON.stringify({ type: 'INPUT', angle, boost, seq: this._seq }));
    }
  }

  public sendRespawn(): void {
    if (this._ws && this.isConnected) {
      this._ws.send(JSON.stringify({ type: 'RESPAWN_REQUEST' }));
    }
  }

  public disconnect(): void {
    if (this._ws) {
      this._ws.close();
      this._ws = null;
      this.isConnected = false;
    }
  }
}
