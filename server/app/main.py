"""
Starlette Application Entry Point for Snake Battle Royale Server.
Provides WebSocket endpoints, game loop lifecycle, health check and static asset serving.

Starlette is used directly rather than FastAPI: this server exposes no request/response
models, so it needs none of FastAPI's pydantic-backed validation layer. Dropping that
dependency also removes pydantic-core, a Rust extension with no Chaquopy wheel, which
is what allows the Android host APK to bundle this server. See REQ-AND-008.
"""

import os
import uuid
from contextlib import asynccontextmanager

from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import FileResponse, HTMLResponse, JSONResponse, Response
from starlette.routing import Mount, Route, WebSocketRoute
from starlette.staticfiles import StaticFiles
from starlette.websockets import WebSocket, WebSocketDisconnect

from server.app.game.engine import GameEngine
from server.app.game.loop import GameLoop
from server.app.network_utils import log_startup_banner
from server.app.websocket_handler import ConnectionManager

# Initialize global engine and connection manager
engine = GameEngine(arena_width=3000.0, arena_height=3000.0, tick_rate=30)
connection_manager = ConnectionManager(engine=engine)
game_loop = GameLoop(engine=engine, connection_manager=connection_manager, tick_rate=30)


@asynccontextmanager
async def lifespan(app: Starlette):
    # Startup: Start background game loop & print LAN IP banner
    await game_loop.start()
    log_startup_banner(port=8000)
    yield
    # Shutdown: Stop game loop cleanly
    await game_loop.stop()


async def health_check(request: Request) -> Response:
    """Health check endpoint."""
    return JSONResponse(
        {
            "status": "healthy",
            "version": "1.0.0-VIPER",
            "active_players": len(connection_manager.active_sockets),
            "tick": engine.tick,
        }
    )


async def websocket_endpoint(websocket: WebSocket) -> None:
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


def resolve_static_dir() -> str | None:
    """
    Resolves static assets directory across development, production, and Android host environments.
    """
    candidates = [
        os.environ.get("SNAKE_STATIC_DIR"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "client", "dist"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "client_dist"),
        os.path.join(os.path.dirname(__file__), "client_dist"),
        os.path.abspath("client/dist"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "client"),
        os.path.abspath("client"),
    ]
    for candidate in candidates:
        if candidate and os.path.exists(candidate) and os.path.isdir(candidate):
            return candidate
    return None


async def serve_spa(request: Request) -> Response:
    full_path = request.path_params.get("full_path", "")
    current_dir = resolve_static_dir()
    if current_dir is not None:
        if full_path:
            file_path = os.path.join(current_dir, full_path)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                return FileResponse(file_path)
        index_file = os.path.join(current_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
    return HTMLResponse(
        content="""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Snake Battle Royale Multiplayer</title>
  </head>
  <body>
    <div id="app">
      <canvas id="game-canvas"></canvas>
    </div>
  </body>
</html>""",
        status_code=200,
    )


def build_routes() -> list:
    """
    Assembles the route table. The SPA catch-all must stay last so that /health,
    /ws and /assets are matched first.
    """
    routes: list = [
        Route("/health", health_check, methods=["GET"]),
        WebSocketRoute("/ws", websocket_endpoint),
    ]

    # Mount static files from client/dist if present
    static_dir = resolve_static_dir()
    if static_dir is not None:
        assets_dir = os.path.join(static_dir, "assets")
        if os.path.exists(assets_dir):
            routes.append(Mount("/assets", app=StaticFiles(directory=assets_dir), name="assets"))

    routes.append(Route("/{full_path:path}", serve_spa, methods=["GET"]))
    return routes


app = Starlette(
    routes=build_routes(),
    lifespan=lifespan,
    # CORS middleware for local development
    middleware=[
        Middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    ],
)
