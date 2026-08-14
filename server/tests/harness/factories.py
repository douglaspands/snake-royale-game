"""
Factories for rapid, deterministic generation of test entities (Snakes, Food, Packets).
"""

from typing import Any, Dict, List
import uuid


class EntityFactory:
    @staticmethod
    def create_snake_data(
        snake_id: str | None = None,
        nickname: str = "TestViper",
        skin: str = "neon_blue",
        head_x: float = 500.0,
        head_y: float = 500.0,
        angle: float = 0.0,
        mass: float = 10.0,
        num_segments: int = 15,
        segment_spacing: float = 8.0,
        alive: bool = True,
        score: int = 100,
        boost: bool = False,
    ) -> Dict[str, Any]:
        """Generates a serialized snake entity dictionary."""
        s_id = snake_id or str(uuid.uuid4())
        body: List[Dict[str, float]] = []
        # Create body segments trailing behind head according to angle
        for i in range(1, num_segments + 1):
            seg_x = head_x - (i * segment_spacing)
            seg_y = head_y
            body.append({"x": seg_x, "y": seg_y})

        return {
            "id": s_id,
            "nickname": nickname,
            "skin": skin,
            "head": {"x": head_x, "y": head_y, "angle": angle},
            "body": body,
            "mass": mass,
            "alive": alive,
            "score": score,
            "boost": boost,
        }

    @staticmethod
    def create_food_data(
        food_id: int = 1,
        x: float = 300.0,
        y: float = 300.0,
        val: float = 1.0,
        food_type: str = "normal",
    ) -> Dict[str, Any]:
        """Generates food pellet data."""
        return {
            "id": food_id,
            "x": x,
            "y": y,
            "val": val,
            "type": food_type,
        }

    @staticmethod
    def create_world_snapshot(
        tick: int = 1,
        timestamp: float = 1000.0,
        snakes: List[Dict[str, Any]] | None = None,
        foods: List[Dict[str, Any]] | None = None,
    ) -> Dict[str, Any]:
        """Generates a valid WORLD_SNAPSHOT dictionary."""
        snk_list = snakes or [EntityFactory.create_snake_data()]
        food_list = foods or [EntityFactory.create_food_data()]
        leaderboard = [
            {
                "id": s["id"],
                "nickname": s["nickname"],
                "score": s["score"],
                "rank": idx + 1,
            }
            for idx, s in enumerate(sorted(snk_list, key=lambda x: x["score"], reverse=True))
        ]

        return {
            "type": "WORLD_SNAPSHOT",
            "tick": tick,
            "timestamp": timestamp,
            "snakes": snk_list,
            "foods": food_list,
            "leaderboard": leaderboard,
        }
