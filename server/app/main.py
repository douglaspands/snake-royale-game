"""
FastAPI Application Entry Point for Snake Battle Royale Server.
Provides WebSocket endpoints, game loop lifecycle, health check and static asset serving.
"""

import os
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from server.app.game.engine import GameEngine
from server.app.game.loop import GameLoop
from server.app.websocket_handler import ConnectionManager

# Initialize global engine and connection manager
engine = GameEngine(arena_width=3000.0, arena_height=3000.0, tick_rate=30)
connection_manager = ConnectionManager(engine=engine)
game_loop = GameLoop(engine=engine, connection_manager=connection_manager, tick_rate=30)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start background game loop
    await game_loop.start()
    yield
    # Shutdown: Stop game loop cleanly
    await game_loop.stop()


app = FastAPI(
    title="Snake Battle Royale Server",
    version="1.0.0-VIPER",
    lifespan=lifespan,
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "1.0.0-VIPER",
        "active_players": len(connection_manager.active_sockets),
        "tick": engine.tick,
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time multiplayer communication."""
    player_id = str(uuid.uuid4())
    await connection_manager.connect(websocket, player_id)

    try:
        while True:
            raw_text = await websocket.receive_text()
            await connection_manager.handle_message(player_id, raw_text)
    except WebSocketDisconnect:
        await connection_manager.disconnect(player_id)
    except Exception:
        await connection_manager.disconnect(player_id)


# Mount static files from client/dist if present
static_dir = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "client", "dist"
)
if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(static_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_dir, "index.html"))
