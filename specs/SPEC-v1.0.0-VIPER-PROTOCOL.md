# SPECIFICATION: v1.0.0-VIPER-PROTOCOL
**Domain:** Real-Time WebSocket Network Protocol  
**Compliance:** [OpenSpec Protocol Domain](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/protocol/spec.md)  

---

## 1. Protocol Architecture
Communication occurs over a bidirectional WebSocket connection at endpoint `/ws`.
All network packets are JSON serialized structures conforming to the schemas defined below.

---

## 2. Packet Schemas

### 2.1 `JOIN` (Client $\rightarrow$ Server)
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

### 2.2 `JOIN_ACK` (Server $\rightarrow$ Client)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "JoinAckPacket",
  "type": "object",
  "required": ["type", "playerId", "arenaWidth", "arenaHeight", "tickRate"],
  "properties": {
    "type": { "type": "string", "enum": ["JOIN_ACK"] },
    "playerId": { "type": "string" },
    "arenaWidth": { "type": "number" },
    "arenaHeight": { "type": "number" },
    "tickRate": { "type": "integer" }
  },
  "additionalProperties": false
}
```

### 2.3 `INPUT` (Client $\rightarrow$ Server)
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

### 2.4 `WORLD_SNAPSHOT` (Server $\rightarrow$ Client Broadcast)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "WorldSnapshotPacket",
  "type": "object",
  "required": ["type", "tick", "timestamp", "snakes", "foods", "leaderboard"],
  "properties": {
    "type": { "type": "string", "enum": ["WORLD_SNAPSHOT"] },
    "tick": { "type": "integer" },
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
          "mass": { "type": "number" },
          "alive": { "type": "boolean" },
          "score": { "type": "integer" },
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
          "type": { "type": "string" }
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
          "rank": { "type": "integer" }
        }
      }
    }
  },
  "additionalProperties": false
}
```

### 2.5 `PLAYER_DEATH` (Server $\rightarrow$ Client)
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

### 2.6 `RESPAWN_REQUEST` (Client $\rightarrow$ Server)
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
