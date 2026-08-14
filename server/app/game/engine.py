"""
Server-Authoritative Game Engine.
Coordinates physics updates, collisions, food absorption, player lifecycle, and snapshot generation.
"""

from typing import Any, Callable, Dict, List, Optional, Set, Tuple
import math
import time

from server.app.game.math2d import Vector2D
from server.app.game.snake import Snake
from server.app.game.food import FoodManager, FoodPellet
from server.app.game.spatial_hash import SpatialHashGrid
from server.app.game.lifecycle import PlayerSession, PlayerState, SpawnManager


class DeathEvent:
    __slots__ = ("player_id", "killer_id", "killer_name", "final_score", "mass")

    def __init__(self, player_id: str, killer_id: Optional[str], killer_name: Optional[str], final_score: int, mass: float):
        self.player_id = player_id
        self.killer_id = killer_id
        self.killer_name = killer_name
        self.final_score = final_score
        self.mass = mass

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "PLAYER_DEATH",
            "killerId": self.killer_id,
            "killerName": self.killer_name,
            "finalScore": self.final_score,
            "mass": round(self.mass, 2),
        }


class GameEngine:
    def __init__(
        self,
        arena_width: float = 3000.0,
        arena_height: float = 3000.0,
        tick_rate: int = 30,
    ):
        self.arena_width = float(arena_width)
        self.arena_height = float(arena_height)
        self.tick_rate = int(tick_rate)
        self.tick = 0

        self.players: Dict[str, PlayerSession] = {}
        self.snakes: Dict[str, Snake] = {}
        self.food_manager = FoodManager(self.arena_width, self.arena_height)
        self.spatial_grid = SpatialHashGrid(cell_size=100.0)

        # Death events generated during the current tick
        self.pending_deaths: List[DeathEvent] = []

    def register_player(self, player_id: str, nickname: str, skin: str) -> PlayerSession:
        """Registers a new player in the lobby."""
        session = PlayerSession(player_id, nickname=nickname, skin=skin)
        self.players[player_id] = session
        return session

    def spawn_player_snake(self, player_id: str) -> Snake:
        """Spawns an active snake for the player in the arena."""
        session = self.players.get(player_id)
        if not session:
            session = self.register_player(player_id, nickname="Player", skin="neon_blue")

        active_snakes = list(self.snakes.values())
        spawn_x, spawn_y, angle = SpawnManager.find_safe_spawn(
            self.arena_width, self.arena_height, active_snakes
        )

        snake = Snake(
            player_id=player_id,
            nickname=session.nickname,
            skin=session.skin,
            spawn_x=spawn_x,
            spawn_y=spawn_y,
            initial_angle=angle,
            initial_mass=10.0,
        )
        self.snakes[player_id] = snake
        session.snake = snake
        session.transition_to(PlayerState.PLAYING)
        return snake

    def remove_player(self, player_id: str) -> None:
        """Removes a player on disconnect and cleans up their entity."""
        if player_id in self.snakes:
            snake = self.snakes.pop(player_id)
            if snake.alive:
                self.food_manager.spawn_corpse_pellets(snake.get_body_segments(), snake.mass)
        self.players.pop(player_id, None)

    def process_input(self, player_id: str, angle: float, boost: bool, seq: int) -> None:
        """Applies input to the player's active snake."""
        session = self.players.get(player_id)
        if not session or not session.snake or not session.snake.alive:
            return

        session.last_input_seq = seq
        session.snake.set_input(target_angle=angle, boost=boost)
        if session.snake.boost:
            session.transition_to(PlayerState.BOOSTING)
        else:
            session.transition_to(PlayerState.PLAYING)

    def respawn_player(self, player_id: str) -> Optional[Snake]:
        """Respawns an eliminated player."""
        session = self.players.get(player_id)
        if not session:
            return None
        session.transition_to(PlayerState.RESPAWNING)
        return self.spawn_player_snake(player_id)

    def step(self, dt: float = 0.0333333333) -> None:
        """
        Advances the entire game state deterministically by dt seconds.
        """
        self.tick += 1
        self.pending_deaths.clear()

        # 1. Step snake movements and collect boost drops
        boost_drops: List[Vector2D] = []
        for snake in list(self.snakes.values()):
            if not snake.alive:
                continue
            drop_pos = snake.step(dt)
            if drop_pos:
                boost_drops.append(drop_pos)

        # Spawn boost pellets
        for drop in boost_drops:
            self.food_manager.spawn_boost_drop(drop)

        # 2. Populate Spatial Hash Grid
        self.spatial_grid.clear()
        for snake in self.snakes.values():
            if snake.alive:
                self.spatial_grid.insert_snake_segments(snake)

        for food in self.food_manager.foods.values():
            self.spatial_grid.insert_food(food)

        # 3. Process Food Absorption
        for snake in self.snakes.values():
            if not snake.alive:
                continue
            search_r = snake.head_radius + 10.0
            nearby_foods = self.spatial_grid.query_nearby_foods(snake.head, search_r)
            for food in nearby_foods:
                # Check if food was already eaten in this tick
                if food.id not in self.food_manager.foods:
                    continue
                d = snake.head.distance_to(food.pos)
                if d <= (snake.head_radius + food.radius):
                    snake.add_mass(food.val)
                    self.food_manager.remove_food(food.id)

        # 4. Check Arena Boundary Collisions
        dead_this_tick: Dict[str, Tuple[Optional[str], Optional[str]]] = {}
        for s_id, snake in self.snakes.items():
            if not snake.alive:
                continue
            r = snake.head_radius
            if (
                snake.head.x <= r
                or snake.head.x >= self.arena_width - r
                or snake.head.y <= r
                or snake.head.y >= self.arena_height - r
            ):
                dead_this_tick[s_id] = (None, "Arena Boundary")

        # 5. Check Head-to-Body and Head-to-Head Collisions
        active_snakes = [s for s in self.snakes.values() if s.alive and s.id not in dead_this_tick]
        for snake in active_snakes:
            # Query nearby body segments
            search_r = snake.head_radius + 40.0
            nearby_segments = self.spatial_grid.query_nearby_segments(snake.head, search_r)
            for seg_ref in nearby_segments:
                # If self segment, ignore first 6 segments
                if seg_ref.snake_id == snake.id and seg_ref.segment_idx <= 6:
                    continue

                other_snake = self.snakes.get(seg_ref.snake_id)
                if not other_snake:
                    continue

                # If touching enemy neck segment while in head-to-head range, defer to head-to-head resolution
                if seg_ref.snake_id != snake.id and seg_ref.segment_idx <= 2:
                    if snake.head.distance_to(other_snake.head) <= (snake.head_radius + other_snake.head_radius) * 1.1:
                        continue

                d = snake.head.distance_to(seg_ref.pos)
                threshold = (snake.head_radius + other_snake.body_radius) * 0.85
                if d < threshold:
                    dead_this_tick[snake.id] = (other_snake.id, other_snake.nickname)
                    break

        # Check Head-to-Head Collisions
        for i in range(len(active_snakes)):
            s1 = active_snakes[i]
            if s1.id in dead_this_tick:
                continue
            for j in range(i + 1, len(active_snakes)):
                s2 = active_snakes[j]
                if s2.id in dead_this_tick:
                    continue
                d = s1.head.distance_to(s2.head)
                if d < (s1.head_radius + s2.head_radius) * 0.85:
                    # Resolve winner based on mass
                    if s1.mass > s2.mass * 1.1:
                        dead_this_tick[s2.id] = (s1.id, s1.nickname)
                    elif s2.mass > s1.mass * 1.1:
                        dead_this_tick[s1.id] = (s2.id, s2.nickname)
                    else:
                        dead_this_tick[s1.id] = (s2.id, s2.nickname)
                        dead_this_tick[s2.id] = (s1.id, s1.nickname)

        # 6. Apply Deaths and Convert to Corpse Pellets
        for dead_id, (killer_id, killer_name) in dead_this_tick.items():
            snake = self.snakes.get(dead_id)
            if not snake or not snake.alive:
                continue

            snake.alive = False
            session = self.players.get(dead_id)
            if session:
                session.transition_to(PlayerState.DEAD)
                session.final_score = snake.score
                session.killer_id = killer_id
                session.killer_name = killer_name

            # Spawn corpse food
            self.food_manager.spawn_corpse_pellets(snake.get_body_segments(), snake.mass)

            # Record death event
            self.pending_deaths.append(
                DeathEvent(
                    player_id=dead_id,
                    killer_id=killer_id,
                    killer_name=killer_name,
                    final_score=snake.score,
                    mass=snake.mass,
                )
            )

        # 7. Maintain ambient food density
        self.food_manager.maintain_food_density()

    def get_leaderboard(self, top_n: int = 10) -> List[Dict[str, Any]]:
        """Calculates current Top-N leaderboard sorted by score descending."""
        sorted_snakes = sorted(
            [s for s in self.snakes.values() if s.alive],
            key=lambda s: s.score,
            reverse=True,
        )
        return [
            {
                "id": s.id,
                "nickname": s.nickname,
                "score": s.score,
                "rank": idx + 1,
            }
            for idx, s in enumerate(sorted_snakes[:top_n])
        ]

    def create_snapshot(self, timestamp: Optional[float] = None) -> Dict[str, Any]:
        """Generates OpenSpec compliant WORLD_SNAPSHOT packet."""
        ts = timestamp if timestamp is not None else time.time() * 1000.0
        return {
            "type": "WORLD_SNAPSHOT",
            "tick": self.tick,
            "timestamp": round(ts, 2),
            "snakes": [s.to_dict() for s in self.snakes.values() if s.alive],
            "foods": self.food_manager.to_list(),
            "leaderboard": self.get_leaderboard(top_n=10),
        }
