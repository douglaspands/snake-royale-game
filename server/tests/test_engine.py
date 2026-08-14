"""
Unit tests for GameEngine execution, collision resolution, deaths
and OpenSpec snapshot schema conformance.
"""

from server.app.game.engine import GameEngine
from server.app.game.math2d import Vector2D
from server.tests.harness.schema_validator import SchemaValidator


def test_game_engine_registration_and_spawn():
    engine = GameEngine(arena_width=3000.0, arena_height=3000.0, tick_rate=30)
    session = engine.register_player("p-1", "Viper", "neon_blue")
    assert session.player_id == "p-1"

    snake = engine.spawn_player_snake("p-1")
    assert snake is not None
    assert snake.id == "p-1"
    assert snake.alive is True
    assert "p-1" in engine.snakes


def test_game_engine_boundary_death():
    engine = GameEngine(arena_width=3000.0, arena_height=3000.0, tick_rate=30)
    engine.register_player("p-1", "Viper", "neon_blue")
    snake = engine.spawn_player_snake("p-1")

    # Place snake right next to left boundary moving left
    snake.head = Vector2D(10.0, 500.0)
    snake.angle = 3.14159

    # Step engine
    engine.step(0.033)
    assert snake.alive is False
    assert len(engine.pending_deaths) == 1
    death_evt = engine.pending_deaths[0]
    assert death_evt.player_id == "p-1"


def test_game_engine_head_to_body_collision():
    engine = GameEngine(arena_width=3000.0, arena_height=3000.0, tick_rate=30)
    engine.register_player("victim", "Victim", "neon_blue")
    engine.register_player("obstacle", "Obstacle", "cyber_pink")

    s_victim = engine.spawn_player_snake("victim")
    s_obs = engine.spawn_player_snake("obstacle")

    # Obstacle is horizontal moving right from (500, 500)
    s_obs.head = Vector2D(500.0, 500.0)
    s_obs.angle = 0.0
    s_obs.target_angle = 0.0
    s_obs._init_body()

    # Victim head is moving directly into obstacle's 5th body segment at (460, 500)
    s_obs_seg = s_obs.get_body_segments()[4]  # around (460, 500)
    s_victim.head = Vector2D(s_obs_seg.x, s_obs_seg.y - 1.0)
    s_victim.angle = 1.5708  # moving down into obstacle body
    s_victim.target_angle = 1.5708
    s_victim._init_body()

    engine.step(0.033)
    assert s_victim.alive is False
    assert s_obs.alive is True


def test_game_engine_head_to_head_collision():
    engine = GameEngine(arena_width=3000.0, arena_height=3000.0, tick_rate=30)
    engine.register_player("big", "BigSnake", "neon_blue")
    engine.register_player("small", "SmallSnake", "cyber_pink")

    s_big = engine.spawn_player_snake("big")
    s_small = engine.spawn_player_snake("small")

    s_big.mass = 50.0
    s_small.mass = 10.0

    # Big snake moving right from (985, 1000)
    s_big.head = Vector2D(985.0, 1000.0)
    s_big.angle = 0.0
    s_big.target_angle = 0.0
    s_big._init_body()

    # Small snake moving left from (1015, 1000)
    s_small.head = Vector2D(1015.0, 1000.0)
    s_small.angle = 3.14159
    s_small.target_angle = 3.14159
    s_small._init_body()

    engine.step(0.033)
    assert s_small.alive is False
    assert s_big.alive is True

    # Test equal mass collision -> both die
    engine2 = GameEngine()
    s1 = engine2.spawn_player_snake("eq1")
    s2 = engine2.spawn_player_snake("eq2")
    s1.mass = 20.0
    s2.mass = 20.0

    s1.head = Vector2D(985.0, 1000.0)
    s1.angle = 0.0
    s1.target_angle = 0.0
    s1._init_body()

    s2.head = Vector2D(1015.0, 1000.0)
    s2.angle = 3.14159
    s2.target_angle = 3.14159
    s2._init_body()

    engine2.step(0.033)
    assert s1.alive is False
    assert s2.alive is False


def test_player_removal_and_respawn():
    engine = GameEngine()
    snake = engine.spawn_player_snake("p-respawn")
    snake.mass = 30.0

    # Process input with boost
    engine.process_input("p-respawn", angle=1.0, boost=True, seq=1)
    assert snake.boost is True

    # Process input for unknown player
    engine.process_input("unknown", angle=1.0, boost=False, seq=1)

    # Respawn unknown player
    assert engine.respawn_player("unknown") is None

    # Respawn valid player
    new_snake = engine.respawn_player("p-respawn")
    assert new_snake is not None

    # Remove player
    engine.remove_player("p-respawn")
    assert "p-respawn" not in engine.players
    assert "p-respawn" not in engine.snakes

    # Remove unknown player
    engine.remove_player("unknown")


def test_game_engine_snapshot_schema_validation(validator: type[SchemaValidator]):
    engine = GameEngine(arena_width=3000.0, arena_height=3000.0, tick_rate=30)
    engine.register_player("p-1", "Viper1", "neon_blue")
    engine.spawn_player_snake("p-1")
    engine.register_player("p-2", "Viper2", "cyber_pink")
    engine.spawn_player_snake("p-2")

    engine.step(0.033)
    snapshot = engine.create_snapshot()

    # Must pass OpenSpec JSON schema
    assert validator.validate(snapshot) is True
    assert snapshot["tick"] == 1
    assert len(snapshot["snakes"]) == 2
    assert 550 <= len(snapshot["foods"]) <= 600
    assert len(snapshot["leaderboard"]) == 2
