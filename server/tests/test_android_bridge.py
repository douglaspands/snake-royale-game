"""
Unit tests for Android Python bridge entry point lifecycle and configuration.
"""

import builtins
import importlib.util
import os
from typing import Any
from unittest.mock import MagicMock, patch

# Dynamically load android_entry module
android_entry_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "android",
    "app",
    "src",
    "main",
    "python",
    "android_entry.py",
)
spec = importlib.util.spec_from_file_location("android_entry", android_entry_path)
assert spec is not None and spec.loader is not None
android_entry: Any = importlib.util.module_from_spec(spec)
spec.loader.exec_module(android_entry)


def test_android_entry_initial_state():
    assert android_entry.is_running() is False
    assert android_entry.get_port() == 8000
    status = android_entry.get_status()
    assert status["running"] is False
    assert status["port"] == 8000


def test_android_entry_start_and_stop_lifecycle():
    with patch("uvicorn.Server") as mock_server_cls:
        mock_instance = MagicMock()
        mock_server_cls.return_value = mock_instance

        started = android_entry.start_server(
            host="0.0.0.0",
            port=8080,
            static_dir="/tmp/test_static",
            host_ip="192.168.1.50",
        )
        assert started is True
        assert os.environ.get("SNAKE_STATIC_DIR") == "/tmp/test_static"
        assert os.environ.get("SNAKE_HOST_IP") == "192.168.1.50"
        assert android_entry.get_port() == 8080

        # Attempting duplicate start returns False
        assert android_entry.start_server(port=8080) is False

        # Stopping server
        stopped = android_entry.stop_server()
        assert stopped is True
        assert mock_instance.should_exit is True
        assert android_entry.is_running() is False


def test_static_dir_is_exported_before_server_module_is_imported():
    """
    `server.app.main` resolves its static directory while building the route table at
    import time. If `android_entry` imported it at module scope, that resolution would
    run before `start_server` exports SNAKE_STATIC_DIR -- the /assets mount would be
    missing and the device would serve a blank page. Guards REQ-AND-003.
    """
    # The module must not have bound `app` at import time.
    assert not hasattr(android_entry, "app")

    android_entry._is_running = False
    android_entry._server_instance = None
    os.environ.pop("SNAKE_STATIC_DIR", None)

    seen: dict[str, str | None] = {}

    real_import = builtins.__import__

    def recording_import(name: str, *args: Any, **kwargs: Any) -> Any:
        if name == "server.app.main":
            seen["static_dir"] = os.environ.get("SNAKE_STATIC_DIR")
        return real_import(name, *args, **kwargs)

    with patch("uvicorn.Server"), patch.object(builtins, "__import__", recording_import):
        assert android_entry.start_server(port=8099, static_dir="/tmp/spa_bundle") is True

    assert seen["static_dir"] == "/tmp/spa_bundle", (
        "server.app.main was imported before SNAKE_STATIC_DIR was exported"
    )

    android_entry._is_running = False
    android_entry._server_instance = None


def test_android_entry_stop_when_not_running():
    # Force state not running
    android_entry._is_running = False
    android_entry._server_instance = None
    assert android_entry.stop_server() is False
