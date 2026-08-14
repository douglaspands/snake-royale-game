## Purpose
WebSocket communication protocol and JSON schemas.

## ADDED Requirements

### Requirement: REQ-PROTO-001 Client Connection Handshake (JOIN)
The client MUST send a JOIN packet upon connecting to the WebSocket server.

#### Scenario: Handshake packet sent
- **WHEN** WebSocket opens
- **THEN** client sends JOIN packet with nickname and skin
