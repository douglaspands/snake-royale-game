# OpenSpec: Network Protocol Specification
**Domain:** `protocol`  
**Version:** `1.0.0-VIPER`  
**Status:** `ACTIVE`  

---

## 1. Overview
This specification defines the communication protocol between the Snake Royale frontend client and the server-authoritative backend over WebSockets (`/ws`). All payloads SHALL be encoded as JSON UTF-8 strings.

---

## 2. Requirements & Packet Specifications

### REQ-PROTO-001: Client Connection Handshake (`JOIN`)
The client MUST send a `JOIN` packet immediately upon establishing the WebSocket connection.

#### JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "JoinPacket",
  "type": "object",
  "required": ["type", "nickname", "skin"],
  "properties": {
    "type": { "type": "string", "enum": ["JOIN"] },
    "nickname": { "type": "string", "minLength": 1, "maxLength": 16 },
    "skin": { "type": "string", "enum": ["classic", "neon_blue", "cyber_pink", "toxic_green", "solar_gold"] }
  },
  "additionalProperties": false
}
```

---

### REQ-PROTO-002: Server Acknowledgment (`JOIN_ACK`)
Upon validating the `JOIN` packet, the server MUST reply with a `JOIN_ACK` containing the player's unique assigned `playerId`, spawn position, arena dimensions, and current tick rate.

#### JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "JoinAckPacket",
  "type": "object",
  "required": ["type", "playerId", "arenaWidth", "arenaHeight", "tickRate"],
  "properties": {
    "type": { "type": "string", "enum": ["JOIN_ACK"] },
    "playerId": { "type": "string" },
    "arenaWidth": { "type": "number", "minimum": 1000 },
    "arenaHeight": { "type": "number", "minimum": 1000 },
    "tickRate": { "type": "integer", "minimum": 10, "maximum": 60 }
  },
  "additionalProperties": false
}
```

---

### REQ-PROTO-003: Player Input Stream (`INPUT`)
The client SHALL stream input packets to the server containing the desired heading angle (in radians) and the boost flag.

#### JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "InputPacket",
  "type": "object",
  "required": ["type", "angle", "boost", "seq"],
  "properties": {
    "type": { "type": "string", "enum": ["INPUT"] },
    "angle": { "type": "number" },
    "boost": { "type": "boolean" },
    "seq": { "type": "integer", "minimum": 0 }
  },
  "additionalProperties": false
}
```

---

### REQ-PROTO-004: World Snapshot Broadcast (`WORLD_SNAPSHOT`)
The server MUST broadcast a full or delta `WORLD_SNAPSHOT` to all connected clients at the engine tick rate (30-40 Hz).

#### JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "WorldSnapshotPacket",
  "type": "object",
  "required": ["type", "tick", "timestamp", "snakes", "foods", "leaderboard"],
  "properties": {
    "type": { "type": "string", "enum": ["WORLD_SNAPSHOT"] },
    "tick": { "type": "integer", "minimum": 0 },
    "timestamp": { "type": "number" },
    "snakes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "nickname", "skin", "head", "body", "mass", "alive", "score", "boost"],
        "properties": {
          "id": { "type": "string" },
          "nickname": { "type": "string" },
          "skin": { "type": "string" },
          "head": {
            "type": "object",
            "required": ["x", "y", "angle"],
            "properties": {
              "x": { "type": "number" },
              "y": { "type": "number" },
              "angle": { "type": "number" }
            }
          },
          "body": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["x", "y"],
              "properties": {
                "x": { "type": "number" },
                "y": { "type": "number" }
              }
            }
          },
          "mass": { "type": "number", "minimum": 1 },
          "alive": { "type": "boolean" },
          "score": { "type": "integer", "minimum": 0 },
          "boost": { "type": "boolean" }
        }
      }
    },
    "foods": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "x", "y", "val", "type"],
        "properties": {
          "id": { "type": "integer" },
          "x": { "type": "number" },
          "y": { "type": "number" },
          "val": { "type": "number" },
          "type": { "type": "string", "enum": ["normal", "boost_drop", "corpse"] }
        }
      }
    },
    "leaderboard": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "nickname", "score", "rank"],
        "properties": {
          "id": { "type": "string" },
          "nickname": { "type": "string" },
          "score": { "type": "integer" },
          "rank": { "type": "integer", "minimum": 1 }
        }
      }
    }
  },
  "additionalProperties": false
}
```

---

### REQ-PROTO-005: Death Notification (`PLAYER_DEATH`)
When a snake dies due to boundary collision or hitting another snake's body, the server MUST emit a `PLAYER_DEATH` packet to the affected client.

#### JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PlayerDeathPacket",
  "type": "object",
  "required": ["type", "killerId", "killerName", "finalScore", "mass"],
  "properties": {
    "type": { "type": "string", "enum": ["PLAYER_DEATH"] },
    "killerId": { "type": ["string", "null"] },
    "killerName": { "type": ["string", "null"] },
    "finalScore": { "type": "integer" },
    "mass": { "type": "number" }
  },
  "additionalProperties": false
}
```

---

### REQ-PROTO-006: Respawn Request (`RESPAWN_REQUEST`)
A dead player MAY request to respawn in the same room.

#### JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "RespawnRequestPacket",
  "type": "object",
  "required": ["type"],
  "properties": {
    "type": { "type": "string", "enum": ["RESPAWN_REQUEST"] }
  },
  "additionalProperties": false
}
```

---

## 3. Scenarios (GIVEN / WHEN / THEN)

### Scenario: Client handshake validation
- **GIVEN** a new WebSocket client connection
- **WHEN** client sends a valid `JOIN` payload `{"type": "JOIN", "nickname": "ViperKing", "skin": "neon_blue"}`
- **THEN** server assigns a UUID `playerId` and responds with a valid `JOIN_ACK` payload within 100ms.

### Scenario: Input processing
- **GIVEN** an active snake in `PLAYING` state
- **WHEN** client sends `{"type": "INPUT", "angle": 1.5708, "boost": true, "seq": 42}`
- **THEN** the server applies the target angle and sets boost mode for the next physics tick.
