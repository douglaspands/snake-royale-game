"""
Async Game Loop runner executing at 30-40 Hz tick rate.
"""

import asyncio
import contextlib
import logging
import time

from server.app.game.engine import GameEngine
from server.app.websocket_handler import ConnectionManager

logger = logging.getLogger("server.gameloop")


class GameLoop:
    def __init__(
        self, engine: GameEngine, connection_manager: ConnectionManager, tick_rate: int = 30
    ):
        self.engine = engine
        self.connection_manager = connection_manager
        self.tick_rate = tick_rate
        self.dt = 1.0 / tick_rate
        self._running = False
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        """Starts the async game loop background task."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info(f"GameLoop started at {self.tick_rate} Hz (dt={self.dt:.4f}s)")

    async def stop(self) -> None:
        """Stops the game loop."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        logger.info("GameLoop stopped")

    async def _run_loop(self) -> None:
        """Main game tick loop."""
        while self._running:
            start_time = time.monotonic()

            try:
                # 1. Step the physics engine
                self.engine.step(self.dt)

                # 2. Dispatch any death events generated in this tick
                if self.engine.pending_deaths:
                    await self.connection_manager.dispatch_deaths(self.engine.pending_deaths)

                # 3. Broadcast snapshot to all active connections
                if self.connection_manager.active_sockets:
                    snapshot = self.engine.create_snapshot()
                    await self.connection_manager.broadcast_snapshot(snapshot)

            except Exception as e:
                logger.error(f"Error in GameLoop tick: {e}", exc_info=True)

            elapsed = time.monotonic() - start_time
            sleep_time = max(0.0, self.dt - elapsed)
            await asyncio.sleep(sleep_time)
