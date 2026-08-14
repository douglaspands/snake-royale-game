"""
Unit tests for async GameLoop lifecycle, starting, stopping, tick execution and error resilience.
"""

import asyncio
import pytest
from server.app.game.engine import GameEngine
from server.app.game.loop import GameLoop
from server.app.websocket_handler import ConnectionManager


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
    engine = GameEngine(arena_width=3000.0, arena_height=3000.0, tick_rate=60)
    conn_mgr = ConnectionManager(engine=engine)
    loop = GameLoop(engine=engine, connection_manager=conn_mgr, tick_rate=60)

    # Force step to raise an exception once
    orig_step = engine.step
    raised = False

    def faulty_step(dt):
        nonlocal raised
        if not raised:
            raised = True
            raise RuntimeError("Simulated physics error")
        orig_step(dt)

    engine.step = faulty_step

    await loop.start()
    await asyncio.sleep(0.05)
    await loop.stop()

    assert raised is True
