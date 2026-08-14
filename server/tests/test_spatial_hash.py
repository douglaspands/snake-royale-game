"""
Unit tests for Spatial Hash Partitioning Grid.
"""

from server.app.game.food import FoodPellet
from server.app.game.math2d import Vector2D
from server.app.game.snake import Snake
from server.app.game.spatial_hash import SpatialHashGrid


def test_spatial_hash_insertion_and_query():
    grid = SpatialHashGrid(cell_size=100.0)

    # Insert snake segments
    snake = Snake(
        player_id="s-1",
        nickname="Viper",
        spawn_x=250.0,
        spawn_y=250.0,
        initial_angle=0.0,
    )
    grid.insert_snake_segments(snake)

    # Query near head position
    results = grid.query_nearby_segments(Vector2D(250.0, 250.0), radius=50.0)
    assert len(results) > 0
    assert results[0].snake_id == "s-1"

    # Query distant position
    distant_results = grid.query_nearby_segments(Vector2D(1500.0, 1500.0), radius=50.0)
    assert len(distant_results) == 0


def test_spatial_hash_food_query():
    grid = SpatialHashGrid(cell_size=100.0)
    food = FoodPellet(food_id=99, x=500.0, y=500.0, val=1.0)
    grid.insert_food(food)

    nearby = grid.query_nearby_foods(Vector2D(510.0, 510.0), radius=20.0)
    assert len(nearby) == 1
    assert nearby[0].id == 99
