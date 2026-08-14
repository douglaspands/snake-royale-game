"""
Unit tests for async GameLoop lifecycle, starting, stopping,
tick execution and error resilience.
"""

import asyncio

import pytest

from server.app.game.engine import GameEngine
from server.app.game.loop import GameLoop
from server.app.websocket_handler import ConnectionManager


class FaultyGameEngine(GameEngine):
    def __init__(self, *args: object, **kwargs: object) -> None:
        super().__init__(arena_width=3000.0, arena_height=3000.0, tick_rate=60)
        self.raised: bool = False

    def step(self, dt: float = 0.033) -> None:
        if not self.raised:
            self.raised = True
            raise RuntimeError("Simulated physics error")
        super().step(dt)


@pytest.mark.asyncio
async def test_game_loop_start_and_stop():
    engine = GameEngine(arena_width=3000.0, arena_height=3000.0, tick_rate=60)
    conn_mgr = ConnectionManager(engine=engine)
    loop = GameLoop(engine=engine, connection_manager=conn_mgr, tick_rate=60)

    # Start loop
    await loop.start()
    assert loop._running is True

    # Calling start again when already running should be a no-op
    await loop.start()
    assert loop._running is True

    # Allow loop to run 2 ticks
    await asyncio.sleep(0.05)
    assert engine.tick >= 1

    # Stop loop
    await loop.stop()
    assert loop._running is False


@pytest.mark.asyncio
async def test_game_loop_tick_exception_resilience():
    engine = FaultyGameEngine()
    conn_mgr = ConnectionManager(engine=engine)
    loop = GameLoop(engine=engine, connection_manager=conn_mgr, tick_rate=60)

    await loop.start()
    await asyncio.sleep(0.05)
    await loop.stop()

    assert engine.raised is True
