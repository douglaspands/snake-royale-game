"""
In-memory Mock WebSocket Client for deterministic testing of game server interactions.
"""

import json
from typing import Any, Dict, List
from server.tests.harness.schema_validator import SchemaValidator


class MockClient:
    def __init__(self, client_id: str, nickname: str = "Player", skin: str = "neon_blue"):
        self.client_id = client_id
        self.nickname = nickname
        self.skin = skin
        self.received_messages: List[Dict[str, Any]] = []
        self.seq = 0
        self.is_connected = True

    async def send_json(self, data: Dict[str, Any]) -> None:
        """Simulates receiving a JSON message from the server."""
        if not self.is_connected:
            raise ConnectionError("Mock client is disconnected")
        # Validate message against OpenSpec schema
        SchemaValidator.validate(data)
        self.received_messages.append(data)

    def get_last_message(self) -> Dict[str, Any] | None:
        """Returns the most recently received message."""
        return self.received_messages[-1] if self.received_messages else None

    def get_messages_of_type(self, msg_type: str) -> List[Dict[str, Any]]:
        """Filters received messages by type."""
        return [m for m in self.received_messages if m.get("type") == msg_type]

    def create_join_packet(self) -> Dict[str, Any]:
        """Creates a valid JOIN packet."""
        return {
            "type": "JOIN",
            "nickname": self.nickname,
            "skin": self.skin,
        }

    def create_input_packet(self, angle: float, boost: bool = False) -> Dict[str, Any]:
        """Creates an INPUT packet with incrementing sequence number."""
        self.seq += 1
        return {
            "type": "INPUT",
            "angle": angle,
            "boost": boost,
            "seq": self.seq,
        }

    def create_respawn_packet(self) -> Dict[str, Any]:
        """Creates a RESPAWN_REQUEST packet."""
        return {
            "type": "RESPAWN_REQUEST",
        }

    def disconnect(self) -> None:
        """Simulates socket disconnection."""
        self.is_connected = False
