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

# Maximum real elapsed time (seconds) accounted for in a single loop iteration.
# Bounds the accumulator so a long stall (e.g. GC pause, CPU contention with the
# JVM/ART runtime under Chaquopy) drops unsimulated backlog instead of causing
# the loop to accumulate an unbounded debt.
MAX_FRAME_TIME = 0.25

# Maximum number of engine.step() catch-up calls executed within one iteration.
# Protects against a "spiral of death" where each iteration takes longer than
# dt to process its own catch-up steps, permanently falling further behind.
MAX_CATCHUP_STEPS = 5


def compute_catchup_steps(accumulator: float, dt: float, max_steps: int) -> tuple[int, float]:
    """
    Pure function computing how many fixed-dt simulation steps to run to drain
    the accumulator, bounded by max_steps.

    Returns (steps_to_run, remaining_accumulator). When the accumulator holds
    more than max_steps * dt worth of time, the excess backlog beyond
    max_steps is dropped entirely (not queued for a future iteration), so the
    loop resumes normal single-step-per-tick pacing on the next iteration
    instead of compounding the debt.
    """
    if dt <= 0:
        return 0, accumulator

    steps_needed = int(accumulator // dt)
    steps_to_run = min(steps_needed, max_steps)

    # When backlog exceeds what we're willing to catch up on this iteration,
    # drop the unsimulated excess rather than carrying it forward.
    remaining_accumulator = 0.0 if steps_needed > max_steps else accumulator - (steps_to_run * dt)

    return steps_to_run, remaining_accumulator


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
        """
        Main game tick loop.

        Uses a fixed-timestep accumulator with bounded catch-up: real elapsed
        wall-clock time between iterations is accumulated (clamped to
        MAX_FRAME_TIME per iteration) and drained via 0..MAX_CATCHUP_STEPS
        calls to engine.step(self.dt), so simulated time tracks actual
        elapsed time instead of always advancing by exactly one dt per
        iteration. A single snapshot is broadcast per loop iteration
        regardless of how many catch-up steps ran within it.
        """
        accumulator = 0.0
        # Seed last_time one dt in the past so the very first iteration
        # accounts for a normal single-tick interval instead of ~0 elapsed
        # time (which would otherwise skip simulation on the first pass).
        last_time = time.monotonic() - self.dt

        while self._running:
            iter_start = time.monotonic()
            frame_time = min(iter_start - last_time, MAX_FRAME_TIME)
            last_time = iter_start
            accumulator += frame_time

            try:
                # 1. Drain the accumulator with fixed-dt catch-up steps
                steps_to_run, accumulator = compute_catchup_steps(
                    accumulator, self.dt, MAX_CATCHUP_STEPS
                )
                for _ in range(steps_to_run):
                    self.engine.step(self.dt)

                # 2. Dispatch any death events generated in this tick
                if self.engine.pending_deaths:
                    await self.connection_manager.dispatch_deaths(self.engine.pending_deaths)

                # 3. Broadcast snapshot to all active connections (once per
                # iteration, not once per catch-up step)
                if self.connection_manager.active_sockets:
                    snapshot = self.engine.create_snapshot(tick_duration_ms=frame_time * 1000.0)
                    await self.connection_manager.broadcast_snapshot(snapshot)

            except Exception as e:
                logger.error(f"Error in GameLoop tick: {e}", exc_info=True)

            elapsed = time.monotonic() - iter_start
            sleep_time = max(0.0, self.dt - elapsed)
            await asyncio.sleep(sleep_time)
