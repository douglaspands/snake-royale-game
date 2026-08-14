# OpenSpec Delta: Network Protocol Enhancements
**Domain:** `protocol`  
**Change ID:** `v1.1.0-reflex`  
**Target:** `openspec/specs/protocol/spec.md`  

---

## 1. Modified Requirements

### REQ-PROTO-003: High-Resolution Input Packet (`INPUT`)
The client SHALL stream input packets with sequence identifiers (`seq`) and optional client timestamp (`clientTime`) to enable server sequencing and client-side reconciliation.

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
    "seq": { "type": "integer", "minimum": 0 },
    "clientTime": { "type": "number" }
  },
  "additionalProperties": false
}
```

### REQ-PROTO-004: World Snapshot with Input Acknowledgment (`WORLD_SNAPSHOT`)
The `WORLD_SNAPSHOT` payload SHALL include `ackSeq` for each snake or in global metadata to permit exact client reconciliation of buffered unacknowledged inputs.

---

## 2. Behavioral Scenarios

### Scenario: Immediate Input Transmission
- **GIVEN** an active client in gameplay
- **WHEN** user presses a directional key or turns mouse by $\Delta \theta \ge 0.015\text{ rad}$
- **THEN** an `INPUT` packet is dispatched immediately with incremented `seq` without waiting for the next periodic loop tick.
