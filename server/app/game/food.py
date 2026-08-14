"""
Food pellet management, ambient spawning, boost drops, and corpse distribution.
"""

import random
from typing import Any

from server.app.game.math2d import Vector2D


class FoodPellet:
    __slots__ = ("id", "pos", "val", "type", "radius")

    def __init__(
        self, food_id: int, x: float, y: float, val: float = 1.0, food_type: str = "normal"
    ):
        self.id = food_id
        self.pos = Vector2D(x, y)
        self.val = float(val)
        self.type = food_type
        self.radius = 6.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "x": round(self.pos.x, 2),
            "y": round(self.pos.y, 2),
            "val": round(self.val, 2),
            "type": self.type,
        }


class FoodManager:
    TARGET_AMBIENT_COUNT: int = 600
    MIN_FOOD_THRESHOLD: int = 500

    def __init__(self, arena_width: float = 3000.0, arena_height: float = 3000.0):
        self.arena_width = arena_width
        self.arena_height = arena_height
        self._next_id: int = 1
        self.foods: dict[int, FoodPellet] = {}
        self.seed_initial_food()

    def _get_next_id(self) -> int:
        nid = self._next_id
        self._next_id += 1
        return nid

    def seed_initial_food(self) -> None:
        """Populates the arena with initial ambient food pellets."""
        self.foods.clear()
        self.maintain_food_density()

    def maintain_food_density(self) -> None:
        """Spawns ambient food up to TARGET_AMBIENT_COUNT if below threshold."""
        current_count = len(self.foods)
        if current_count < self.MIN_FOOD_THRESHOLD:
            needed = self.TARGET_AMBIENT_COUNT - current_count
            for _ in range(needed):
                # Spawn food avoiding immediate edge (50px margin)
                x = random.uniform(50.0, self.arena_width - 50.0)
                y = random.uniform(50.0, self.arena_height - 50.0)
                fid = self._get_next_id()
                self.foods[fid] = FoodPellet(fid, x, y, val=1.0, food_type="normal")

    def spawn_boost_drop(self, pos: Vector2D, val: float = 1.0) -> None:
        """Spawns a boost drop pellet at position with equivalent value."""
        # Add slight jitter to drop location
        jx = pos.x + random.uniform(-4.0, 4.0)
        jy = pos.y + random.uniform(-4.0, 4.0)
        fid = self._get_next_id()
        self.foods[fid] = FoodPellet(fid, jx, jy, val=val, food_type="boost_drop")

    def spawn_corpse_pellets(self, body_points: list[Vector2D], total_mass: float) -> None:
        """
        Converts 80% of a dead snake's mass into corpse food pellets along its body coordinates.
        """
        if not body_points or total_mass <= 0:
            return

        conserved_mass = total_mass * 0.8
        num_pellets = min(50, max(5, int(len(body_points) * 0.7)))
        val_per_pellet = max(0.5, conserved_mass / num_pellets)

        # Distribute along body segments
        step = max(1, len(body_points) // num_pellets)
        for i in range(0, len(body_points), step):
            pt = body_points[i]
            fid = self._get_next_id()
            jx = pt.x + random.uniform(-8.0, 8.0)
            jy = pt.y + random.uniform(-8.0, 8.0)
            # Clamp inside arena
            jx = max(20.0, min(self.arena_width - 20.0, jx))
            jy = max(20.0, min(self.arena_height - 20.0, jy))
            self.foods[fid] = FoodPellet(fid, jx, jy, val=val_per_pellet, food_type="corpse")

    def remove_food(self, food_id: int) -> None:
        """Removes an eaten food pellet."""
        self.foods.pop(food_id, None)

    def to_list(self) -> list[dict[str, Any]]:
        """Returns serialized food list."""
        return [f.to_dict() for f in self.foods.values()]
