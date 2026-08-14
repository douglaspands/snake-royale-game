"""
WebSocket Handler managing real-time bidirectional client connections, input streaming and event dispatch.
"""

import asyncio
import json
import logging
from typing import Any, Dict, Optional, Set
from fastapi import WebSocket, WebSocketDisconnect

from server.app.game.engine import GameEngine, DeathEvent
from server.tests.harness.schema_validator import SchemaValidator

logger = logging.getLogger("server.websocket")


class ConnectionManager:
    def __init__(self, engine: GameEngine):
        self.engine = engine
        self.active_sockets: Dict[str, WebSocket] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, player_id: str) -> None:
        """Accepts and stores an active WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self.active_sockets[player_id] = websocket

    async def disconnect(self, player_id: str) -> None:
        """Cleans up disconnected player socket and engine state."""
        async with self._lock:
            self.active_sockets.pop(player_id, None)
        self.engine.remove_player(player_id)

    async def send_personal_message(self, player_id: str, message: Dict[str, Any]) -> None:
        """Sends a JSON message to a specific player."""
        ws = self.active_sockets.get(player_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"Error sending message to {player_id}: {e}")

    async def broadcast_snapshot(self, snapshot: Dict[str, Any]) -> None:
        """Broadcasts WORLD_SNAPSHOT to all connected players."""
        payload_str = json.dumps(snapshot)
        disconnected = []

        for player_id, ws in list(self.active_sockets.items()):
            try:
                await ws.send_text(payload_str)
            except Exception:
                disconnected.append(player_id)

        for pid in disconnected:
            await self.disconnect(pid)

    async def dispatch_deaths(self, deaths: list[DeathEvent]) -> None:
        """Sends PLAYER_DEATH packet directly to each eliminated player."""
        for death in deaths:
            await self.send_personal_message(death.player_id, death.to_dict())

    async def handle_message(self, player_id: str, raw_text: str) -> None:
        """Parses and handles incoming WebSocket messages from a client."""
        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError:
            return

        msg_type = data.get("type")
        if not msg_type:
            return

        if msg_type == "JOIN":
            nickname = str(data.get("nickname", "Player"))[:16]
            skin = str(data.get("skin", "neon_blue"))
            self.engine.register_player(player_id, nickname=nickname, skin=skin)
            self.engine.spawn_player_snake(player_id)

            ack_packet = {
                "type": "JOIN_ACK",
                "playerId": player_id,
                "arenaWidth": self.engine.arena_width,
                "arenaHeight": self.engine.arena_height,
                "tickRate": self.engine.tick_rate,
            }
            await self.send_personal_message(player_id, ack_packet)

        elif msg_type == "INPUT":
            angle = float(data.get("angle", 0.0))
            boost = bool(data.get("boost", False))
            seq = int(data.get("seq", 0))
            self.engine.process_input(player_id, angle=angle, boost=boost, seq=seq)

        elif msg_type == "RESPAWN_REQUEST":
            self.engine.respawn_player(player_id)
