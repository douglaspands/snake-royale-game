## ADDED Requirements

### Requirement: REQ-PROTO-007 Single Active Input Source for the INPUT Stream
The client MUST derive the heading angle sent in each `INPUT` packet from exactly one control scheme at a time: mouse/keyboard aim, or the touch virtual joystick. Mouse/keyboard aim tracking MUST ignore pointer events whose type is not `mouse`, so that a touch-synthesized pointer event cannot alter the aimed heading. When the touch virtual joystick is released, the client MUST continue transmitting the joystick's own last commanded heading angle rather than substituting the heading angle of a different, inactive control scheme.

#### Scenario: Touch input cannot contaminate mouse aim
- **WHEN** a touch or pen pointer event is dispatched on the client
- **THEN** the stored mouse/keyboard aim angle MUST NOT change as a result

#### Scenario: Releasing the virtual joystick holds the last commanded heading
- **GIVEN** the player has been steering with the touch virtual joystick
- **WHEN** the player releases the joystick
- **THEN** subsequent INPUT packets MUST carry the joystick's last commanded heading angle, not the mouse/keyboard aim angle

#### Scenario: Switching to mouse aim after touch use
- **GIVEN** the touch virtual joystick was the most recently active control scheme
- **WHEN** the player provides a genuine mouse-move or keyboard event
- **THEN** subsequent INPUT packets MUST carry the newly active mouse/keyboard aim angle
