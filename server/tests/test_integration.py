"""
Integration test verifying single-command production SPA static file serving on FastAPI.
"""

from starlette.testclient import TestClient

from server.app.main import app


def test_serve_spa_index():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    assert "Snake Battle Royale" in response.text
    assert '<canvas id="game-canvas">' in response.text


def test_health_check_live():
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"
