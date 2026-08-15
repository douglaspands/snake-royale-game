"""
Android Python Bridge Entry Point for Snake Battle Royale Server.
Provides lifecycle controls (start_server, stop_server, is_running) for
invocation from Kotlin ServerForegroundService in Chaquopy environment.
"""

import asyncio
import logging
import os
import threading
from typing import Any

import uvicorn

from server.app.main import app

logger = logging.getLogger("android.server")

_server_instance: uvicorn.Server | None = None
_server_thread: threading.Thread | None = None
_server_loop: asyncio.AbstractEventLoop | None = None
_is_running: bool = False
_current_port: int = 8000


def start_server(
    host: str = "0.0.0.0",
    port: int = 8000,
    static_dir: str | None = None,
    host_ip: str | None = None,
) -> bool:
    """
    Starts the Uvicorn ASGI server in a dedicated background thread.
    Returns True if started successfully, False if already running.
    """
    global _server_instance, _server_thread, _server_loop, _is_running, _current_port

    if _is_running:
        logger.warning("Server is already running on port %d", _current_port)
        return False

    if static_dir:
        os.environ["SNAKE_STATIC_DIR"] = static_dir
    if host_ip:
        os.environ["SNAKE_HOST_IP"] = host_ip

    _current_port = port

    config = uvicorn.Config(
        app=app,
        host=host,
        port=port,
        log_level="info",
        loop="asyncio",
        lifespan="on",
    )
    _server_instance = uvicorn.Server(config)
    _is_running = True

    def _run_server():
        global _is_running, _server_loop
        _server_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_server_loop)
        logger.info("Snake Server starting on %s:%d", host, port)
        try:
            _server_loop.run_until_complete(_server_instance.serve())  # type: ignore
        except Exception as e:
            logger.error("Server loop error: %s", e)
        finally:
            _is_running = False
            logger.info("Snake Server stopped")

    _server_thread = threading.Thread(target=_run_server, daemon=True, name="SnakeServerThread")
    _server_thread.start()
    return True


def stop_server() -> bool:
    """
    Signals the Uvicorn server to shutdown gracefully.
    Returns True if stopped, False if not running.
    """
    global _server_instance, _is_running

    if not _is_running or _server_instance is None:
        return False

    _server_instance.should_exit = True
    _is_running = False
    return True


def is_running() -> bool:
    """Returns whether the server is actively running."""
    return _is_running


def get_port() -> int:
    """Returns the current port the server is listening on."""
    return _current_port


def get_status() -> dict[str, Any]:
    """Returns a dictionary with server health and lifecycle status."""
    return {
        "running": _is_running,
        "port": _current_port,
        "thread_alive": _server_thread.is_alive() if _server_thread else False,
    }
