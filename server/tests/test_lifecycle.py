"""
Unit tests for Player session lifecycle and safe spawn mechanics.
"""

from server.app.game.lifecycle import PlayerSession, PlayerState, SpawnManager
from server.app.game.snake import Snake


def test_player_session_transitions():
    session = PlayerSession(player_id="p-1", nickname="Alpha")
    assert session.state == PlayerState.LOBBY

    session.transition_to(PlayerState.PLAYING)
    assert session.state == PlayerState.PLAYING

    session.transition_to(PlayerState.BOOSTING)
    assert session.state == PlayerState.BOOSTING

    session.transition_to(PlayerState.DEAD)
    assert session.state == PlayerState.DEAD


def test_safe_spawn_manager():
    existing_snake = Snake(
        player_id="other",
        nickname="Other",
        spawn_x=1000.0,
        spawn_y=1000.0,
    )
    spawn_x, spawn_y, angle = SpawnManager.find_safe_spawn(
        arena_width=3000.0,
        arena_height=3000.0,
        existing_snakes=[existing_snake],
        min_safe_distance=150.0,
    )
    # Check that coordinates are within arena boundaries
    assert 200.0 <= spawn_x <= 2800.0
    assert 200.0 <= spawn_y <= 2800.0
    assert -3.15 <= angle <= 3.15
