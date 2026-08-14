"""
Schema Validator for OpenSpec v1.0.0-VIPER WebSocket packets.
Validates all incoming and outgoing messages against strict JSON Schemas.
"""

import json
from typing import Any

import jsonschema

JOIN_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "JoinPacket",
    "type": "object",
    "required": ["type", "nickname", "skin"],
    "properties": {
        "type": {"type": "string", "enum": ["JOIN"]},
        "nickname": {"type": "string", "minLength": 1, "maxLength": 16},
        "skin": {
            "type": "string",
            "enum": ["classic", "neon_blue", "cyber_pink", "toxic_green", "solar_gold"],
        },
    },
    "additionalProperties": False,
}

JOIN_ACK_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "JoinAckPacket",
    "type": "object",
    "required": ["type", "playerId", "arenaWidth", "arenaHeight", "tickRate"],
    "properties": {
        "type": {"type": "string", "enum": ["JOIN_ACK"]},
        "playerId": {"type": "string"},
        "arenaWidth": {"type": "number", "minimum": 1000},
        "arenaHeight": {"type": "number", "minimum": 1000},
        "tickRate": {"type": "integer", "minimum": 10, "maximum": 60},
    },
    "additionalProperties": False,
}

INPUT_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "InputPacket",
    "type": "object",
    "required": ["type", "angle", "boost", "seq"],
    "properties": {
        "type": {"type": "string", "enum": ["INPUT"]},
        "angle": {"type": "number"},
        "boost": {"type": "boolean"},
        "seq": {"type": "integer", "minimum": 0},
    },
    "additionalProperties": False,
}

WORLD_SNAPSHOT_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "WorldSnapshotPacket",
    "type": "object",
    "required": ["type", "tick", "timestamp", "snakes", "foods", "leaderboard"],
    "properties": {
        "type": {"type": "string", "enum": ["WORLD_SNAPSHOT"]},
        "tick": {"type": "integer", "minimum": 0},
        "timestamp": {"type": "number"},
        "snakes": {
            "type": "array",
            "items": {
                "type": "object",
                "required": [
                    "id",
                    "nickname",
                    "skin",
                    "head",
                    "body",
                    "mass",
                    "alive",
                    "score",
                    "boost",
                ],
                "properties": {
                    "id": {"type": "string"},
                    "nickname": {"type": "string"},
                    "skin": {"type": "string"},
                    "head": {
                        "type": "object",
                        "required": ["x", "y", "angle"],
                        "properties": {
                            "x": {"type": "number"},
                            "y": {"type": "number"},
                            "angle": {"type": "number"},
                        },
                    },
                    "body": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["x", "y"],
                            "properties": {
                                "x": {"type": "number"},
                                "y": {"type": "number"},
                            },
                        },
                    },
                    "mass": {"type": "number", "minimum": 1},
                    "alive": {"type": "boolean"},
                    "score": {"type": "integer", "minimum": 0},
                    "boost": {"type": "boolean"},
                },
            },
        },
        "foods": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "x", "y", "val", "type"],
                "properties": {
                    "id": {"type": "integer"},
                    "x": {"type": "number"},
                    "y": {"type": "number"},
                    "val": {"type": "number"},
                    "type": {"type": "string", "enum": ["normal", "boost_drop", "corpse"]},
                },
            },
        },
        "leaderboard": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "nickname", "score", "rank"],
                "properties": {
                    "id": {"type": "string"},
                    "nickname": {"type": "string"},
                    "score": {"type": "integer"},
                    "rank": {"type": "integer", "minimum": 1},
                },
            },
        },
    },
    "additionalProperties": False,
}

PLAYER_DEATH_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "PlayerDeathPacket",
    "type": "object",
    "required": ["type", "killerId", "killerName", "finalScore", "mass"],
    "properties": {
        "type": {"type": "string", "enum": ["PLAYER_DEATH"]},
        "killerId": {"type": ["string", "null"]},
        "killerName": {"type": ["string", "null"]},
        "finalScore": {"type": "integer"},
        "mass": {"type": "number"},
    },
    "additionalProperties": False,
}

RESPAWN_REQUEST_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "RespawnRequestPacket",
    "type": "object",
    "required": ["type"],
    "properties": {
        "type": {"type": "string", "enum": ["RESPAWN_REQUEST"]},
    },
    "additionalProperties": False,
}

SCHEMAS: dict[str, dict[str, Any]] = {
    "JOIN": JOIN_SCHEMA,
    "JOIN_ACK": JOIN_ACK_SCHEMA,
    "INPUT": INPUT_SCHEMA,
    "WORLD_SNAPSHOT": WORLD_SNAPSHOT_SCHEMA,
    "PLAYER_DEATH": PLAYER_DEATH_SCHEMA,
    "RESPAWN_REQUEST": RESPAWN_REQUEST_SCHEMA,
}


class SchemaValidator:
    @staticmethod
    def validate(data: dict[str, Any] | str) -> bool:
        """
        Validates a dictionary or JSON string payload against the registered schema.
        Raises jsonschema.ValidationError on failure.
        """
        payload = json.loads(data) if isinstance(data, str) else data

        packet_type = payload.get("type")
        if not packet_type or packet_type not in SCHEMAS:
            raise jsonschema.ValidationError(f"Unknown or missing packet type: {packet_type}")

        schema = SCHEMAS[packet_type]
        jsonschema.validate(instance=payload, schema=schema)
        return True

    @staticmethod
    def is_valid(data: dict[str, Any] | str) -> bool:
        """Returns True if valid, False otherwise."""
        try:
            return SchemaValidator.validate(data)
        except Exception:
            return False
