"""
Desktop executable entry point for Snake Battle Royale.

Serves two purposes with a single script:
  1. `python -m server.app` — a zero-setup local run of the unified server.
  2. The PyInstaller onefile build target packaged for Linux, Windows and
     macOS in `.github/workflows/release.yml`.

Starts the embedded Starlette/Uvicorn server bound to all interfaces
(0.0.0.0:8000), waits until `/health` responds, then opens the host OS's
default web browser to http://localhost:8000. No Node.js, Python
interpreter or manual setup is required on the end-user machine when run
as the packaged executable. See REQ-DESK-001.
"""

import os
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser

import uvicorn

HOST = "0.0.0.0"  # noqa: S104 -- intentional: LAN players join via this host's IP, see REQ-DESK-001
PORT = 8000
HEALTH_URL = f"http://127.0.0.1:{PORT}/health"
BROWSER_URL = f"http://localhost:{PORT}"
HEALTH_POLL_INTERVAL_SECONDS = 0.1
HEALTH_POLL_TIMEOUT_SECONDS = 30.0

# Two directories up from this file (server/app/__main__.py) is the project
# root. Ensures `server.app.main` resolves whether this script is invoked
# directly (`python server/app/__main__.py`) or as the PyInstaller entry
# script, in addition to the `python -m server.app` case where Python
# already places the current working directory on sys.path.
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)


def _resolve_frozen_static_dir() -> None:
    """
    When running as a PyInstaller onefile executable, client/dist is bundled
    under sys._MEIPASS/client_dist (see the --add-data flag building
    `snake-royale-desktop-*` in .github/workflows/release.yml). Point
    resolve_static_dir() at it before the Starlette app builds its route
    table, mirroring how the Android host sets SNAKE_STATIC_DIR.
    """
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass is not None and "SNAKE_STATIC_DIR" not in os.environ:
        candidate = os.path.join(meipass, "client_dist")
        if os.path.isdir(candidate):
            os.environ["SNAKE_STATIC_DIR"] = candidate


def _wait_for_health(
    url: str,
    timeout_seconds: float = HEALTH_POLL_TIMEOUT_SECONDS,
    poll_interval_seconds: float = HEALTH_POLL_INTERVAL_SECONDS,
) -> bool:
    """
    Polls the health endpoint on a short interval (never a single fixed
    sleep) until it responds successfully or the bounded timeout elapses.
    """
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=poll_interval_seconds) as response:
                if response.status == 200:
                    return True
        except (urllib.error.URLError, OSError, TimeoutError):
            pass
        time.sleep(poll_interval_seconds)
    return False


def main() -> None:
    _resolve_frozen_static_dir()

    # Imported after the env var above is set, since resolve_static_dir()
    # (server/app/main.py) reads SNAKE_STATIC_DIR while building the route
    # table at module import time.
    from server.app.main import app

    server_thread = threading.Thread(
        target=uvicorn.run,
        kwargs={"app": app, "host": HOST, "port": PORT, "log_level": "info"},
        daemon=True,
        name="uvicorn-server",
    )
    server_thread.start()

    if _wait_for_health(HEALTH_URL):
        webbrowser.open(BROWSER_URL)
    else:
        print(
            f"Server did not respond on {HEALTH_URL} within "
            f"{HEALTH_POLL_TIMEOUT_SECONDS}s; not opening browser.",
            file=sys.stderr,
        )

    try:
        while server_thread.is_alive():
            server_thread.join(timeout=1.0)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
