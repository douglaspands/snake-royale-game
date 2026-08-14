"""
Unit tests for FastAPI endpoints, WebSocket lifecycle, connection manager, broadcasts and errors.
"""

import json
import pytest
from starlette.testclient import TestClient
from server.app.main import app
from server.app.game.engine import GameEngine, DeathEvent
from server.app.websocket_handler import ConnectionManager


def test_health_check_endpoint():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "1.0.0-VIPER"


def test_websocket_join_input_and_respawn_flow():
    client = TestClient(app)
    with client.websocket_connect("/ws") as websocket:
        # Send JOIN packet
        join_packet = {
            "type": "JOIN",
            "nickname": "TestHero",
            "skin": "neon_blue",
        }
        websocket.send_json(join_packet)

        # Receive JOIN_ACK
        ack = websocket.receive_json()
        assert ack["type"] == "JOIN_ACK"
        assert "playerId" in ack
        assert ack["arenaWidth"] == 3000

        # Send INPUT packet
        input_packet = {
            "type": "INPUT",
            "angle": 1.57,
            "boost": False,
            "seq": 1,
        }
        websocket.send_json(input_packet)

        # Send RESPAWN_REQUEST packet
        respawn_packet = {
            "type": "RESPAWN_REQUEST",
        }
        websocket.send_json(respawn_packet)


@pytest.mark.asyncio
async def test_connection_manager_broadcast_and_errors():
    engine = GameEngine()
    conn_mgr = ConnectionManager(engine=engine)

    # Mock failing websocket
    class FailingWebSocket:
        async def send_text(self, text: str):
            raise ConnectionResetError("Client dropped")

    class HealthyWebSocket:
        def __init__(self):
            self.sent = []
        async def send_text(self, text: str):
            self.sent.append(text)

    healthy_ws = HealthyWebSocket()
    failing_ws = FailingWebSocket()

    conn_mgr.active_sockets["p1"] = healthy_ws  # type: ignore
    conn_mgr.active_sockets["p2"] = failing_ws  # type: ignore

    # Broadcast snapshot
    snapshot = {"type": "WORLD_SNAPSHOT", "tick": 1, "snakes": []}
    await conn_mgr.broadcast_snapshot(snapshot)

    # Failing socket should have been disconnected and removed
    assert "p2" not in conn_mgr.active_sockets
    assert "p1" in conn_mgr.active_sockets
    assert len(healthy_ws.sent) == 1

    # Test send_personal_message failure handling
    await conn_mgr.send_personal_message("nonexistent", {"test": 1})
    conn_mgr.active_sockets["p-fail"] = failing_ws  # type: ignore
    await conn_mgr.send_personal_message("p-fail", {"test": 1})

    # Test dispatch_deaths
    deaths = [DeathEvent("p1", "killer-1", "Killer", 500, 25.0)]
    await conn_mgr.dispatch_deaths(deaths)
    assert len(healthy_ws.sent) == 2


@pytest.mark.asyncio
async def test_connection_manager_handle_invalid_messages():
    engine = GameEngine()
    conn_mgr = ConnectionManager(engine=engine)

    # Invalid JSON
    await conn_mgr.handle_message("p1", "invalid-json")

    # Missing type
    await conn_mgr.handle_message("p1", json.dumps({"foo": "bar"}))
