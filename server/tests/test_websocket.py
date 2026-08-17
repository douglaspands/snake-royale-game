"""
Unit tests for FastAPI endpoints, WebSocket lifecycle, connection manager, broadcasts and errors.
"""

import asyncio
import json

import pytest
from starlette.testclient import TestClient

from server.app.game.engine import DeathEvent, GameEngine
from server.app.main import app
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
async def test_connection_manager_broadcast_concurrent_dispatch():
    """REQ-LOOP-003: a slow client's send must not delay delivery to others.

    Sends are dispatched concurrently (asyncio.gather), so the other clients'
    payloads are delivered without waiting for the slow client's send to
    resolve. Only sockets whose send actually raises get disconnected.
    """
    engine = GameEngine()
    conn_mgr = ConnectionManager(engine=engine)

    class SlowWebSocket:
        def __init__(self):
            self.release = asyncio.Event()
            self.sent: list[str] = []

        async def send_text(self, text: str):
            await self.release.wait()
            self.sent.append(text)

    class HealthyWebSocket:
        def __init__(self):
            self.sent: list[str] = []

        async def send_text(self, text: str):
            self.sent.append(text)

    class FailingWebSocket:
        async def send_text(self, text: str):
            raise ConnectionResetError("Client dropped")

    slow_ws = SlowWebSocket()
    healthy_ws_1 = HealthyWebSocket()
    healthy_ws_2 = HealthyWebSocket()
    failing_ws = FailingWebSocket()

    conn_mgr.active_sockets["slow"] = slow_ws  # type: ignore
    conn_mgr.active_sockets["p1"] = healthy_ws_1  # type: ignore
    conn_mgr.active_sockets["p2"] = healthy_ws_2  # type: ignore
    conn_mgr.active_sockets["p3"] = failing_ws  # type: ignore

    snapshot = {"type": "WORLD_SNAPSHOT", "tick": 1, "snakes": []}
    broadcast_task = asyncio.create_task(conn_mgr.broadcast_snapshot(snapshot))

    # Yield control to the event loop so every concurrently-dispatched send
    # gets a chance to run up to its await point.
    await asyncio.sleep(0)
    await asyncio.sleep(0)

    # The healthy clients already received their snapshot even though the
    # slow client's send is still pending on its event.
    assert len(healthy_ws_1.sent) == 1
    assert len(healthy_ws_2.sent) == 1
    assert slow_ws.sent == []

    # Unblock the slow client and let the broadcast finish.
    slow_ws.release.set()
    await broadcast_task

    assert len(slow_ws.sent) == 1
    assert "slow" in conn_mgr.active_sockets
    assert "p1" in conn_mgr.active_sockets
    assert "p2" in conn_mgr.active_sockets
    assert "p3" not in conn_mgr.active_sockets


@pytest.mark.asyncio
async def test_connection_manager_handle_invalid_messages():
    engine = GameEngine()
    conn_mgr = ConnectionManager(engine=engine)

    # Invalid JSON
    await conn_mgr.handle_message("p1", "invalid-json")

    # Missing type
    await conn_mgr.handle_message("p1", json.dumps({"foo": "bar"}))
