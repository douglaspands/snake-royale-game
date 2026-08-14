"""
Unit tests for Food management, ambient replenishment, boost drops, and corpse creation.
"""

import pytest
from server.app.game.math2d import Vector2D
from server.app.game.food import FoodManager


def test_food_initial_density():
    fm = FoodManager(arena_width=3000.0, arena_height=3000.0)
    assert len(fm.foods) == FoodManager.TARGET_AMBIENT_COUNT


def test_food_replenishment():
    fm = FoodManager(arena_width=3000.0, arena_height=3000.0)
    # Remove half the foods
    food_ids = list(fm.foods.keys())[:200]
    for fid in food_ids:
        fm.remove_food(fid)

    assert len(fm.foods) < FoodManager.MIN_FOOD_THRESHOLD
    fm.maintain_food_density()
    assert len(fm.foods) == FoodManager.TARGET_AMBIENT_COUNT


def test_corpse_pellets_spawn():
    fm = FoodManager(arena_width=3000.0, arena_height=3000.0)
    initial_count = len(fm.foods)

    body_points = [Vector2D(100.0 + i * 10, 100.0) for i in range(20)]
    snake_mass = 50.0

    fm.spawn_corpse_pellets(body_points, snake_mass)
    assert len(fm.foods) > initial_count

    corpse_foods = [f for f in fm.foods.values() if f.type == "corpse"]
    assert len(corpse_foods) > 0
    total_corpse_val = sum(f.val for f in corpse_foods)
    # Check that ~80% of mass is conserved
    assert pytest.approx(total_corpse_val, 1.0) == snake_mass * 0.8
