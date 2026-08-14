"""
Snake entity representation and physics movement.
"""

import math
from typing import Any

from server.app.game.math2d import Vector2D, step_angle


class Snake:
    BASE_SPEED: float = 180.0  # px/s
    BOOST_SPEED: float = 360.0  # px/s
    TURN_RATE: float = 4.5  # rad/s
    MIN_BOOST_MASS: float = 15.0
    BOOST_MASS_DRAIN: float = 4.0  # mass/s
    BASE_SEGMENT_SPACING: float = 8.0  # px between segments
    BASE_SEGMENT_COUNT: int = 10

    def __init__(
        self,
        player_id: str,
        nickname: str,
        skin: str = "neon_blue",
        spawn_x: float = 500.0,
        spawn_y: float = 500.0,
        initial_angle: float = 0.0,
        initial_mass: float = 10.0,
    ):
        self.id = player_id
        self.nickname = nickname
        self.skin = skin
        self.head = Vector2D(spawn_x, spawn_y)
        self.angle = initial_angle
        self.target_angle = initial_angle
        self.mass = float(initial_mass)
        self.alive = True
        self.score = int(self.mass * 10)
        self.boost = False
        self.killer_id: str | None = None
        self.killer_name: str | None = None

        # Trajectory point history for precise segment following
        self.trajectory: list[Vector2D] = []
        self._init_body()

    def _init_body(self) -> None:
        """Initializes the snake body with initial segments trailing behind head."""
        target_len = self.target_segment_count
        self.trajectory = []
        # Populate history points
        for i in range(target_len + 1):
            pos = Vector2D(
                self.head.x - (i * self.BASE_SEGMENT_SPACING) * math.cos(self.angle),
                self.head.y - (i * self.BASE_SEGMENT_SPACING) * math.sin(self.angle),
            )
            self.trajectory.append(pos)

    @property
    def target_segment_count(self) -> int:
        """Calculates total segment count based on current mass."""
        return self.BASE_SEGMENT_COUNT + int(self.mass * 1.5)

    @property
    def head_radius(self) -> float:
        """Dynamic head collision radius."""
        return 14.0 + 0.8 * math.sqrt(max(1.0, self.mass))

    @property
    def body_radius(self) -> float:
        """Dynamic body segment collision radius."""
        return 12.0 + 0.7 * math.sqrt(max(1.0, self.mass))

    @property
    def speed(self) -> float:
        """Current velocity magnitude."""
        if self.boost and self.mass >= self.MIN_BOOST_MASS:
            return self.BOOST_SPEED
        return self.BASE_SPEED

    def set_input(self, target_angle: float, boost: bool) -> None:
        """Updates desired heading angle and turbo state."""
        self.target_angle = target_angle
        self.boost = boost and (self.mass >= self.MIN_BOOST_MASS)

    def step(self, dt: float) -> Vector2D | None:
        """
        Advances the snake's physics by dt seconds.
        Returns a boost pellet drop location if mass was shed, or None.
        """
        if not self.alive:
            return None

        # 1. Turn towards target angle
        max_turn = self.TURN_RATE * dt
        self.angle = step_angle(self.angle, self.target_angle, max_turn)

        # 2. Boost mass drain
        dropped_pellet_pos: Vector2D | None = None
        if self.boost and self.mass >= self.MIN_BOOST_MASS:
            mass_lost = self.BOOST_MASS_DRAIN * dt
            self.mass = max(self.MIN_BOOST_MASS - 0.1, self.mass - mass_lost)
            if self.mass < self.MIN_BOOST_MASS:
                self.boost = False
            # Drop pellet at tail if body exists
            if len(self.trajectory) > 2:
                tail = self.trajectory[-1]
                dropped_pellet_pos = Vector2D(tail.x, tail.y)

        # 3. Advance head
        dist = self.speed * dt
        self.head.x += math.cos(self.angle) * dist
        self.head.y += math.sin(self.angle) * dist

        # 4. Update body trajectory with inverse kinematics / distance spacing
        self._update_trajectory()

        # 5. Update score
        self.score = max(self.score, int(self.mass * 10))

        return dropped_pellet_pos

    def _update_trajectory(self) -> None:
        """Updates segment positions maintaining fixed spacing D_segment."""
        target_count = self.target_segment_count
        new_trajectory = [Vector2D(self.head.x, self.head.y)]

        # Adjust each subsequent segment to maintain fixed distance
        prev = self.head
        for i in range(1, max(len(self.trajectory), target_count + 1)):
            curr = self.trajectory[i] if i < len(self.trajectory) else new_trajectory[-1]

            d = prev.distance_to(curr)
            if d > 0.0001:
                # Place segment exactly BASE_SEGMENT_SPACING away from prev
                ratio = self.BASE_SEGMENT_SPACING / d
                seg_x = prev.x + (curr.x - prev.x) * ratio
                seg_y = prev.y + (curr.y - prev.y) * ratio
                seg = Vector2D(seg_x, seg_y)
            else:
                seg = Vector2D(
                    prev.x - self.BASE_SEGMENT_SPACING * math.cos(self.angle),
                    prev.y - self.BASE_SEGMENT_SPACING * math.sin(self.angle),
                )
            new_trajectory.append(seg)
            prev = seg

            if len(new_trajectory) > target_count:
                break

        self.trajectory = new_trajectory

    def add_mass(self, amount: float) -> None:
        """Increases snake mass."""
        self.mass += amount
        self.score = max(self.score, int(self.mass * 10))

    def get_body_segments(self) -> list[Vector2D]:
        """Returns list of body segment points (excluding the head at index 0)."""
        return self.trajectory[1:]

    def to_dict(self) -> dict[str, Any]:
        """Serializes snake to OpenSpec JSON Schema format."""
        return {
            "id": self.id,
            "nickname": self.nickname,
            "skin": self.skin,
            "head": {
                "x": round(self.head.x, 2),
                "y": round(self.head.y, 2),
                "angle": round(self.angle, 4),
            },
            "body": [s.to_dict() for s in self.get_body_segments()],
            "mass": round(self.mass, 2),
            "alive": self.alive,
            "score": self.score,
            "boost": self.boost,
        }
