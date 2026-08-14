"""
Unit tests for Snake movement, turning, growth and boost mechanics.
"""

import math
import pytest
from server.app.game.snake import Snake


def test_snake_initialization():
    snake = Snake(
        player_id="p-1",
        nickname="Viper",
        skin="neon_blue",
        spawn_x=500.0,
        spawn_y=500.0,
        initial_angle=0.0,
        initial_mass=10.0,
    )
    assert snake.id == "p-1"
    assert snake.mass == 10.0
    assert snake.alive is True
    assert snake.target_segment_count == 10 + int(10.0 * 1.5)
    assert len(snake.get_body_segments()) >= 10
    assert snake.head_radius == pytest.approx(14.0 + 0.8 * math.sqrt(10.0), 0.01)


def test_snake_movement_forward():
    snake = Snake(
        player_id="p-1",
        nickname="Viper",
        spawn_x=100.0,
        spawn_y=100.0,
        initial_angle=0.0,
    )
    # Move forward 1 second (180 px)
    snake.step(1.0)
    assert pytest.approx(snake.head.x, 0.1) == 280.0
    assert pytest.approx(snake.head.y, 0.1) == 100.0


def test_snake_boost_drain():
    snake = Snake(
        player_id="p-1",
        nickname="Viper",
        spawn_x=500.0,
        spawn_y=500.0,
        initial_mass=20.0,
    )
    snake.set_input(target_angle=0.0, boost=True)
    assert snake.boost is True
    assert snake.speed == 360.0

    # Step 1 second of boost -> should lose 4.0 mass
    drop_pos = snake.step(1.0)
    assert drop_pos is not None
    assert pytest.approx(snake.mass, 0.1) == 16.0


def test_snake_boost_disabled_when_low_mass():
    snake = Snake(
        player_id="p-1",
        nickname="Viper",
        spawn_x=500.0,
        spawn_y=500.0,
        initial_mass=12.0,  # Below MIN_BOOST_MASS 15.0
    )
    snake.set_input(target_angle=0.0, boost=True)
    assert snake.boost is False
    assert snake.speed == 180.0
