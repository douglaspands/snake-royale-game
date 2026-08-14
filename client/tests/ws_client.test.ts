/**
 * Unit tests for WebSocketClient network lifecycle, callbacks and packet serialization.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WebSocketClient } from '../src/net/ws_client';

class MockWebSocket {
  public static instances: MockWebSocket[] = [];
  public url: string;
  public readyState: number = 0; // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
  public sentMessages: string[] = [];

  public onopen: (() => void) | null = null;
  public onclose: (() => void) | null = null;
  public onerror: ((err: any) => void) | null = null;
  public onmessage: ((evt: { data: string }) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      this.readyState = 1;
      if (this.onopen) this.onopen();
    }, 0);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = 3;
    if (this.onclose) this.onclose();
  }

  simulateMessage(obj: any): void {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(obj) });
    }
  }

  simulateError(err: any): void {
    if (this.onerror) {
      this.onerror(err);
    }
  }
}

describe('WebSocketClient', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    (globalThis as any).WebSocket = MockWebSocket;
  });

  it('should connect and handle JOIN_ACK, WORLD_SNAPSHOT, and PLAYER_DEATH packets', async () => {
    const client = new WebSocketClient('ws://localhost:8000/ws');
    expect(client.isConnected).toBe(false);

    const connectPromise = client.connect();
    await connectPromise;
    expect(client.isConnected).toBe(true);

    const ws = MockWebSocket.instances[0];
    expect(ws).toBeDefined();

    let ackReceived: any = null;
    let snapshotReceived: any = null;
    let deathReceived: any = null;
    let wasDisconnected = false;

    client.onJoinAck = (ack) => {
      ackReceived = ack;
    };
    client.onSnapshot = (s) => {
      snapshotReceived = s;
    };
    client.onDeath = (d) => {
      deathReceived = d;
    };
    client.onDisconnect = () => {
      wasDisconnected = true;
    };

    // Simulate JOIN_ACK
    ws.simulateMessage({
      type: 'JOIN_ACK',
      playerId: 'p-42',
      arenaWidth: 3000,
      arenaHeight: 3000,
      tickRate: 30,
    });
    expect(ackReceived).not.toBeNull();
    expect(client.playerId).toBe('p-42');

    // Simulate WORLD_SNAPSHOT
    ws.simulateMessage({
      type: 'WORLD_SNAPSHOT',
      tick: 1,
      timestamp: 1000,
      snakes: [],
      foods: [],
      leaderboard: [],
    });
    expect(snapshotReceived).not.toBeNull();
    expect(snapshotReceived.tick).toBe(1);

    // Simulate PLAYER_DEATH
    ws.simulateMessage({
      type: 'PLAYER_DEATH',
      killerId: 'k1',
      killerName: 'Nemesis',
      finalScore: 900,
      mass: 40,
    });
    expect(deathReceived).not.toBeNull();
    expect(deathReceived.finalScore).toBe(900);

    // Send packets
    client.sendJoin('Hero', 'neon_blue');
    client.sendInput(1.57, true);
    client.sendRespawn();

    expect(ws.sentMessages.length).toBe(3);
    const joinMsg = JSON.parse(ws.sentMessages[0]);
    expect(joinMsg.type).toBe('JOIN');
    const inputMsg = JSON.parse(ws.sentMessages[1]);
    expect(inputMsg.type).toBe('INPUT');
    expect(inputMsg.boost).toBe(true);
    const respawnMsg = JSON.parse(ws.sentMessages[2]);
    expect(respawnMsg.type).toBe('RESPAWN_REQUEST');

    // Disconnect
    client.disconnect();
    expect(client.isConnected).toBe(false);
    expect(wasDisconnected).toBe(true);
  });
});
