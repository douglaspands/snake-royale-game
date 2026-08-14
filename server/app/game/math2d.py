"""
2D Vector and Angle Mathematics utilities for game physics.
"""

import math
from typing import Tuple


class Vector2D:
    __slots__ = ("x", "y")

    def __init__(self, x: float = 0.0, y: float = 0.0):
        self.x = float(x)
        self.y = float(y)

    def __add__(self, other: "Vector2D") -> "Vector2D":
        return Vector2D(self.x + other.x, self.y + other.y)

    def __sub__(self, other: "Vector2D") -> "Vector2D":
        return Vector2D(self.x - other.x, self.y - other.y)

    def __mul__(self, scalar: float) -> "Vector2D":
        return Vector2D(self.x * scalar, self.y * scalar)

    def __rmul__(self, scalar: float) -> "Vector2D":
        return self.__mul__(scalar)

    def __truediv__(self, scalar: float) -> "Vector2D":
        if scalar == 0:
            return Vector2D(0.0, 0.0)
        return Vector2D(self.x / scalar, self.y / scalar)

    def length(self) -> float:
        return math.hypot(self.x, self.y)

    def length_sq(self) -> float:
        return self.x * self.x + self.y * self.y

    def normalized(self) -> "Vector2D":
        l = self.length()
        if l == 0:
            return Vector2D(0.0, 0.0)
        return Vector2D(self.x / l, self.y / l)

    def distance_to(self, other: "Vector2D") -> float:
        return math.hypot(self.x - other.x, self.y - other.y)

    def distance_sq_to(self, other: "Vector2D") -> float:
        dx = self.x - other.x
        dy = self.y - other.y
        return dx * dx + dy * dy

    def to_tuple(self) -> Tuple[float, float]:
        return (self.x, self.y)

    def to_dict(self) -> dict:
        return {"x": round(self.x, 2), "y": round(self.y, 2)}

    def __repr__(self) -> str:
        return f"Vector2D({self.x:.2f}, {self.y:.2f})"


def normalize_angle(angle: float) -> float:
    """Normalizes an angle to the range [-pi, +pi]."""
    return math.atan2(math.sin(angle), math.cos(angle))


def step_angle(current_angle: float, target_angle: float, max_turn_delta: float) -> float:
    """
    Smoothly turns from current_angle toward target_angle, clamped by max_turn_delta.
    """
    diff = normalize_angle(target_angle - current_angle)
    if abs(diff) <= max_turn_delta:
        return normalize_angle(target_angle)
    if diff > 0:
        return normalize_angle(current_angle + max_turn_delta)
    else:
        return normalize_angle(current_angle - max_turn_delta)


def lerp(a: float, b: float, t: float) -> float:
    """Linear interpolation between a and b."""
    return a + (b - a) * t


def lerp_angle(a: float, b: float, t: float) -> float:
    """Interpolates angle along the shortest circular arc."""
    diff = normalize_angle(b - a)
    return normalize_angle(a + diff * t)
