"""
Unit tests for the Backend Test Harness (Virtual Clock, Schema Validator, Mock Client, Factories).
"""

import jsonschema
import pytest

from server.tests.harness.factories import EntityFactory
from server.tests.harness.schema_validator import SchemaValidator
from server.tests.harness.virtual_clock import VirtualClock


def test_virtual_clock_advancement(clock: VirtualClock):
    assert clock.now() == 0.0
    assert clock.tick_count == 0

    clock.step(0.033)
    assert pytest.approx(clock.now(), 0.001) == 0.033
    assert clock.tick_count == 1

    clock.advance_ticks(30, dt=0.0333333333)
    assert pytest.approx(clock.now(), 0.01) == 1.033
    assert clock.tick_count == 31


def test_virtual_clock_scheduled_callbacks(clock: VirtualClock):
    triggered = []

    def on_tick():
        triggered.append(clock.now())

    clock.schedule_after(0.1, on_tick)
    clock.advance_ticks(2, dt=0.033)
    assert len(triggered) == 0

    clock.advance_ticks(2, dt=0.033)
    assert len(triggered) == 1


def test_schema_validator_valid_packets(
    validator: type[SchemaValidator], factory: type[EntityFactory]
):
    join_packet = {"type": "JOIN", "nickname": "Viper", "skin": "neon_blue"}
    assert validator.validate(join_packet) is True

    join_ack = {
        "type": "JOIN_ACK",
        "playerId": "p-123",
        "arenaWidth": 3000,
        "arenaHeight": 3000,
        "tickRate": 30,
    }
    assert validator.validate(join_ack) is True

    input_packet = {"type": "INPUT", "angle": 3.1415, "boost": False, "seq": 1}
    assert validator.validate(input_packet) is True

    snapshot = factory.create_world_snapshot()
    assert validator.validate(snapshot) is True

    death = {
        "type": "PLAYER_DEATH",
        "killerId": "k-1",
        "killerName": "Hydra",
        "finalScore": 450,
        "mass": 45.0,
    }
    assert validator.validate(death) is True


def test_schema_validator_invalid_packets(validator: type[SchemaValidator]):
    with pytest.raises(jsonschema.ValidationError):
        validator.validate({"type": "JOIN", "skin": "neon_blue"})  # Missing nickname

    with pytest.raises(jsonschema.ValidationError):
        validator.validate({"type": "JOIN", "nickname": "", "skin": "neon_blue"})  # Empty nickname

    with pytest.raises(jsonschema.ValidationError):
        validator.validate({"type": "JOIN", "nickname": "Valid", "skin": "invalid_skin"})


@pytest.mark.asyncio
async def test_mock_client_message_flow(create_mock_client, factory: type[EntityFactory]):
    client = create_mock_client("client-test", "Gamer123", "toxic_green")
    join_packet = client.create_join_packet()
    assert join_packet["type"] == "JOIN"
    assert join_packet["nickname"] == "Gamer123"

    input_p1 = client.create_input_packet(angle=1.0, boost=True)
    assert input_p1["seq"] == 1
    input_p2 = client.create_input_packet(angle=1.2, boost=False)
    assert input_p2["seq"] == 2

    snapshot = factory.create_world_snapshot()
    await client.send_json(snapshot)
    assert len(client.received_messages) == 1
    assert client.get_last_message()["type"] == "WORLD_SNAPSHOT"
