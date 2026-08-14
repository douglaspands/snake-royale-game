"""
Spatial Hash Partitioning Grid for O(1) average lookup and O(N) collision detection.
"""

import math
from typing import Dict, List, Set, Tuple
from server.app.game.math2d import Vector2D
from server.app.game.snake import Snake
from server.app.game.food import FoodPellet


class BodySegmentRef:
    __slots__ = ("snake_id", "segment_idx", "pos")

    def __init__(self, snake_id: str, segment_idx: int, pos: Vector2D):
        self.snake_id = snake_id
        self.segment_idx = segment_idx
        self.pos = pos


class SpatialHashGrid:
    def __init__(self, cell_size: float = 100.0):
        self.cell_size = float(cell_size)
        self.body_cells: Dict[Tuple[int, int], List[BodySegmentRef]] = {}
        self.food_cells: Dict[Tuple[int, int], List[FoodPellet]] = {}

    def _get_cell_coords(self, x: float, y: float) -> Tuple[int, int]:
        return (int(x // self.cell_size), int(y // self.cell_size))

    def clear(self) -> None:
        """Clears all grid partitions."""
        self.body_cells.clear()
        self.food_cells.clear()

    def insert_snake_segments(self, snake: Snake) -> None:
        """Inserts all body segments of a snake into the spatial hash."""
        if not snake.alive:
            return
        segments = snake.get_body_segments()
        for idx, seg in enumerate(segments):
            cell = self._get_cell_coords(seg.x, seg.y)
            ref = BodySegmentRef(snake.id, idx + 1, seg)
            if cell not in self.body_cells:
                self.body_cells[cell] = []
            self.body_cells[cell].append(ref)

    def insert_food(self, food: FoodPellet) -> None:
        """Inserts a food pellet into the spatial hash."""
        cell = self._get_cell_coords(food.pos.x, food.pos.y)
        if cell not in self.food_cells:
            self.food_cells[cell] = []
        self.food_cells[cell].append(food)

    def query_nearby_segments(self, pos: Vector2D, radius: float) -> List[BodySegmentRef]:
        """Queries all body segments in the 3x3 surrounding grid cells."""
        min_cell_x = int((pos.x - radius) // self.cell_size)
        max_cell_x = int((pos.x + radius) // self.cell_size)
        min_cell_y = int((pos.y - radius) // self.cell_size)
        max_cell_y = int((pos.y + radius) // self.cell_size)

        result: List[BodySegmentRef] = []
        for cx in range(min_cell_x, max_cell_x + 1):
            for cy in range(min_cell_y, max_cell_y + 1):
                cell = (cx, cy)
                if cell in self.body_cells:
                    result.extend(self.body_cells[cell])
        return result

    def query_nearby_foods(self, pos: Vector2D, radius: float) -> List[FoodPellet]:
        """Queries all food pellets in the 3x3 surrounding grid cells."""
        min_cell_x = int((pos.x - radius) // self.cell_size)
        max_cell_x = int((pos.x + radius) // self.cell_size)
        min_cell_y = int((pos.y - radius) // self.cell_size)
        max_cell_y = int((pos.y + radius) // self.cell_size)

        result: List[FoodPellet] = []
        for cx in range(min_cell_x, max_cell_x + 1):
            for cy in range(min_cell_y, max_cell_y + 1):
                cell = (cx, cy)
                if cell in self.food_cells:
                    result.extend(self.food_cells[cell])
        return result
