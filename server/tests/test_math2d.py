"""
Unit tests for 2D Math and Angle utilities.
"""

import math

import pytest

from server.app.game.math2d import Vector2D, lerp, lerp_angle, normalize_angle, step_angle


def test_vector2d_operations():
    v1 = Vector2D(3.0, 4.0)
    assert v1.length() == 5.0
    assert v1.length_sq() == 25.0

    v2 = Vector2D(1.0, 2.0)
    add_res = v1 + v2
    assert add_res.x == 4.0 and add_res.y == 6.0

    sub_res = v1 - v2
    assert sub_res.x == 2.0 and sub_res.y == 2.0

    mul_res = v1 * 2.0
    assert mul_res.x == 6.0 and mul_res.y == 8.0

    div_res = v1 / 2.0
    assert div_res.x == 1.5 and div_res.y == 2.0

    assert v1.distance_to(Vector2D(6.0, 8.0)) == 5.0
    norm = v1.normalized()
    assert pytest.approx(norm.length(), 0.0001) == 1.0


def test_normalize_angle():
    assert pytest.approx(normalize_angle(0.0), 0.001) == 0.0
    assert pytest.approx(abs(normalize_angle(math.pi * 3)), 0.001) == math.pi
    assert pytest.approx(abs(normalize_angle(-math.pi * 3)), 0.001) == math.pi
    assert pytest.approx(normalize_angle(math.pi / 2), 0.001) == math.pi / 2


def test_step_angle_clamping():
    current = 0.0
    target = math.pi  # 180 degrees
    max_turn = 0.1

    # Should turn toward target by at most max_turn
    stepped = step_angle(current, target, max_turn)
    assert pytest.approx(stepped, 0.001) == 0.1

    # When close to target, should snap directly to target
    assert pytest.approx(step_angle(0.05, 0.08, 0.1), 0.001) == 0.08


def test_lerp_and_lerp_angle():
    assert pytest.approx(lerp(10.0, 20.0, 0.5), 0.001) == 15.0
    assert pytest.approx(lerp_angle(0.0, math.pi / 2, 0.5), 0.001) == math.pi / 4
