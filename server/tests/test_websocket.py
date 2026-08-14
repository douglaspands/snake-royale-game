"""
Unit tests for FastAPI endpoints and WebSocket lifecycle.
"""

import pytest
from starlette.testclient import TestClient
from server.app.main import app


def test_health_check_endpoint():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "1.0.0-VIPER"


def test_websocket_join_and_input_flow():
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
