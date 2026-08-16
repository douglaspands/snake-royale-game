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
        initial_mass=3.0,
    )
    assert snake.id == "p-1"
    assert snake.mass == 3.0
    assert snake.alive is True
    assert snake.target_segment_count == 3
    assert len(snake.get_body_segments()) == 3
    assert snake.head_radius == pytest.approx(14.0 + 0.8 * math.sqrt(3.0), 0.01)


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


def test_snake_boost_drain_and_auto_cutoff():
    snake = Snake(
        player_id="p-1",
        nickname="Viper",
        spawn_x=500.0,
        spawn_y=500.0,
        initial_mass=6.0,
    )
    snake.set_input(target_angle=0.0, boost=True)
    assert snake.boost is True
    assert snake.speed == 360.0

    # Step 0.5 second of boost -> loses 2.0 mass (6.0 -> 4.0) -> drops exactly 2 pellets
    drops = snake.step(0.5)
    assert len(drops) == 2
    assert pytest.approx(snake.mass, 0.1) == 4.0
    assert snake.boost is True

    # Step another 0.5s of boost -> reaches 3.0 (minimum mass)
    # Drops exactly 1 pellet and triggers auto-cutoff
    drops2 = snake.step(0.5)
    assert len(drops2) == 1
    assert pytest.approx(snake.mass, 0.1) == 3.0
    assert snake.boost is False
    assert snake.speed == 180.0
    assert snake.target_segment_count == 3


def test_snake_score_derived_from_mass_not_historical_max():
    # score = floor(mass * 10) at all times; boost's mass drain must
    # reduce score in lockstep, with no historical maximum preserved.
    snake = Snake(
        player_id="p-1",
        nickname="Viper",
        spawn_x=500.0,
        spawn_y=500.0,
        initial_mass=10.0,
    )
    assert snake.score == 100

    snake.set_input(target_angle=0.0, boost=True)
    assert snake.boost is True

    # Step 0.5s of boost -> drains 2.0 mass (10.0 -> 8.0)
    snake.step(0.5)
    assert pytest.approx(snake.mass, 0.1) == 8.0
    assert snake.score == 80

    # Growing again must not resurrect the old peak; score tracks mass exactly.
    snake.add_mass(1.0)
    assert pytest.approx(snake.mass, 0.1) == 9.0
    assert snake.score == 90


def test_snake_boost_disabled_when_at_minimum_mass():
    snake = Snake(
        player_id="p-1",
        nickname="Viper",
        spawn_x=500.0,
        spawn_y=500.0,
        initial_mass=3.0,  # Minimum spawn mass 3.0
    )
    snake.set_input(target_angle=0.0, boost=True)
    assert snake.boost is False
    assert snake.speed == 180.0


def test_snake_agile_turn_rate_model():
    # Spawn mass (3.0) -> high agile turn rate = 9.8 rad/s
    snake = Snake("p-1", "Viper", initial_mass=3.0)
    assert snake.turn_rate == pytest.approx(9.8, 0.01)

    # Turn 90 degrees (pi/2) -> takes ~0.160s (not 0.35s)
    snake.set_input(target_angle=math.pi / 2, boost=False, seq=10)
    assert snake.last_input_seq == 10

    # In 0.161 seconds at 9.8 rad/s, angle sweeps 1.5778 rad >= pi/2
    snake.step(0.161)
    assert snake.angle == pytest.approx(math.pi / 2, 0.01)

    # Giant snake mass (100.0) -> lower scaled turn rate
    giant_snake = Snake("p-2", "Titan", initial_mass=100.0)
    assert giant_snake.turn_rate < 7.5
    assert giant_snake.turn_rate >= 5.2
