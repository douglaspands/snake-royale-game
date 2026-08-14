"""
Deterministic Virtual Clock for zero-sleep testing.
Enables microsecond-precise simulation stepping without wall-clock blocking.
"""

from typing import Callable, List, Tuple


class VirtualClock:
    def __init__(self, start_time: float = 0.0, default_dt: float = 0.0333333333):
        self.current_time = start_time
        self.default_dt = default_dt
        self.tick_count = 0
        self._callbacks: List[Tuple[float, Callable[[], None]]] = []

    def now(self) -> float:
        """Returns the current simulated virtual time in seconds."""
        return self.current_time

    def step(self, dt: float | None = None) -> float:
        """
        Advances the virtual clock by dt seconds (defaults to 1/30s)
        and executes scheduled callbacks.
        """
        step_dt = dt if dt is not None else self.default_dt
        self.current_time += step_dt
        self.tick_count += 1

        # Execute any callbacks scheduled up to the new current time
        ready = [cb for trigger_time, cb in self._callbacks if trigger_time <= self.current_time]
        self._callbacks = [
            (trigger_time, cb)
            for trigger_time, cb in self._callbacks
            if trigger_time > self.current_time
        ]
        for cb in ready:
            cb()

        return self.current_time

    def advance_ticks(self, num_ticks: int, dt: float | None = None) -> float:
        """Advances multiple ticks sequentially."""
        for _ in range(num_ticks):
            self.step(dt)
        return self.current_time

    def schedule_after(self, delay: float, callback: Callable[[], None]) -> None:
        """Schedules a callback to be executed after delay simulated seconds."""
        self._callbacks.append((self.current_time + delay, callback))

    def reset(self, start_time: float = 0.0) -> None:
        """Resets the virtual clock."""
        self.current_time = start_time
        self.tick_count = 0
        self._callbacks.clear()
