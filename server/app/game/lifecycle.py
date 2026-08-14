"""
Player and Room Lifecycle Management and FSM.
"""

import random
from enum import StrEnum

from server.app.game.math2d import Vector2D
from server.app.game.snake import Snake


class PlayerState(StrEnum):
    LOBBY = "LOBBY"
    PLAYING = "PLAYING"
    BOOSTING = "BOOSTING"
    DEAD = "DEAD"
    RESPAWNING = "RESPAWNING"


class PlayerSession:
    def __init__(self, player_id: str, nickname: str = "Player", skin: str = "neon_blue"):
        self.player_id = player_id
        self.nickname = nickname
        self.skin = skin
        self.state: PlayerState = PlayerState.LOBBY
        self.snake: Snake | None = None
        self.last_input_seq: int = 0
        self.final_score: int = 0
        self.killer_id: str | None = None
        self.killer_name: str | None = None

    def transition_to(self, new_state: PlayerState) -> None:
        """Transitions to a new state."""
        self.state = new_state


class SpawnManager:
    @staticmethod
    def find_safe_spawn(
        arena_width: float,
        arena_height: float,
        existing_snakes: list[Snake],
        min_safe_distance: float = 150.0,
        max_attempts: int = 30,
    ) -> tuple[float, float, float]:
        """
        Finds a safe (x, y, angle) spawn location away from any other active snakes.
        """
        margin = 200.0
        best_x = random.uniform(margin, arena_width - margin)
        best_y = random.uniform(margin, arena_height - margin)
        best_distance = 0.0

        for _ in range(max_attempts):
            candidate_x = random.uniform(margin, arena_width - margin)
            candidate_y = random.uniform(margin, arena_height - margin)
            cand_pos = Vector2D(candidate_x, candidate_y)

            # Check distance to all other snake heads and segments
            min_dist_to_any = float("inf")
            for snake in existing_snakes:
                if not snake.alive:
                    continue
                d_head = cand_pos.distance_to(snake.head)
                min_dist_to_any = min(min_dist_to_any, d_head)
                for seg in snake.get_body_segments():
                    min_dist_to_any = min(min_dist_to_any, cand_pos.distance_to(seg))

            if min_dist_to_any >= min_safe_distance:
                random_angle = random.uniform(-3.14159, 3.14159)
                return (candidate_x, candidate_y, random_angle)

            if min_dist_to_any > best_distance:
                best_distance = min_dist_to_any
                best_x = candidate_x
                best_y = candidate_y

        random_angle = random.uniform(-3.14159, 3.14159)
        return (best_x, best_y, random_angle)
