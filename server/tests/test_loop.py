"""
Unit tests for async GameLoop lifecycle, starting, stopping,
tick execution and error resilience.
"""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from server.app.game.engine import GameEngine
from server.app.game.loop import MAX_CATCHUP_STEPS, GameLoop
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


@pytest.mark.asyncio
async def test_game_loop_catchup_overrun_bounded():
    """
    A single overrun iteration (real elapsed time worth 7 ticks) must run
    at most MAX_CATCHUP_STEPS engine.step() calls -- consuming the elapsed
    real time via multiple fixed-dt steps, bounded so it degrades
    gracefully instead of spiraling further behind.
    """
    engine = GameEngine(arena_width=3000.0, arena_height=3000.0, tick_rate=30)
    conn_mgr = ConnectionManager(engine=engine)
    loop = GameLoop(engine=engine, connection_manager=conn_mgr, tick_rate=30)
    dt = loop.dt

    step_calls: list[float] = []
    original_step = engine.step

    def counting_step(step_dt: float = 0.0333333333) -> None:
        step_calls.append(step_dt)
        original_step(step_dt)

    engine.step = counting_step  # type: ignore

    # Scripted monotonic timeline:
    #   A:  seed consumed by `last_time = monotonic() - dt` before the loop
    #   B1: iter_start of the single iteration -- combined with the dt
    #       seeded into last_time, this represents a 7*dt real-time gap
    #   C1: elapsed-time read at the end of the same iteration (no extra
    #       time spent doing the iteration's own work)
    timeline = [0.0, 6 * dt, 6 * dt]

    async def fake_sleep(_seconds: float) -> None:
        loop._running = False

    loop._running = True
    with (
        patch("server.app.game.loop.time.monotonic", side_effect=timeline),
        patch("server.app.game.loop.asyncio.sleep", new=AsyncMock(side_effect=fake_sleep)),
    ):
        await loop._run_loop()

    expected_steps = min(7, MAX_CATCHUP_STEPS)
    assert len(step_calls) == expected_steps
    assert all(call == dt for call in step_calls)


@pytest.mark.asyncio
async def test_game_loop_normal_pacing_one_step_per_iteration():
    """
    Regression: when each iteration's own real-elapsed gap is exactly one
    dt (no overrun), the loop must execute exactly one engine.step() call
    per iteration -- never more, never fewer.
    """
    engine = GameEngine(arena_width=3000.0, arena_height=3000.0, tick_rate=30)
    conn_mgr = ConnectionManager(engine=engine)
    loop = GameLoop(engine=engine, connection_manager=conn_mgr, tick_rate=30)
    dt = loop.dt

    step_calls: list[float] = []
    original_step = engine.step

    def counting_step(step_dt: float = 0.0333333333) -> None:
        step_calls.append(step_dt)
        original_step(step_dt)

    engine.step = counting_step  # type: ignore

    num_iterations = 3
    # A, then (B_i, C_i) per iteration; each iteration's real elapsed time
    # (B_i - previous B) is exactly one dt -- no overrun.
    timeline = [0.0]
    for i in range(num_iterations):
        t = i * dt
        timeline.append(t)  # B_i (iter_start)
        timeline.append(t)  # C_i (elapsed == 0 within the iteration itself)

    sleep_call_count = 0

    async def fake_sleep(_seconds: float) -> None:
        nonlocal sleep_call_count
        sleep_call_count += 1
        if sleep_call_count >= num_iterations:
            loop._running = False

    loop._running = True
    with (
        patch("server.app.game.loop.time.monotonic", side_effect=timeline),
        patch("server.app.game.loop.asyncio.sleep", new=AsyncMock(side_effect=fake_sleep)),
    ):
        await loop._run_loop()

    assert len(step_calls) == num_iterations
    assert all(call == dt for call in step_calls)
