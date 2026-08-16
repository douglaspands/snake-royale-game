## ADDED Requirements

### Requirement: REQ-PROTO-008 Single Active Input Source for the Boost Flag
The rule established by `REQ-PROTO-007` for the heading angle SHALL extend to the boost flag transmitted in each `INPUT` packet. Mouse/keyboard boost tracking MUST ignore pointer events whose type is not `mouse`, so that a touch- or pen-synthesized pointer event cannot raise the mouse/keyboard boost flag. The client MAY continue to transmit boost when either control scheme reports it, so that the touch virtual joystick's own turbo gesture remains effective while the mouse/keyboard scheme owns the heading angle.

#### Scenario: Touch input cannot raise the mouse boost flag
- **WHEN** a touch or pen pointer event with the primary button is dispatched on the client
- **THEN** the mouse/keyboard boost flag MUST remain false

#### Scenario: Steering by touch alone transmits no boost
- **GIVEN** the player is steering with the touch virtual joystick and has not performed the joystick's turbo gesture
- **WHEN** INPUT packets are transmitted during and after the gesture
- **THEN** every such packet MUST carry a boost flag of false

#### Scenario: Genuine mouse button still boosts
- **GIVEN** the player is using a mouse
- **WHEN** the primary mouse button is pressed and then released
- **THEN** the transmitted boost flag MUST become true on press and false on release

#### Scenario: Joystick turbo gesture is unaffected
- **GIVEN** the player performs the virtual joystick's double-tap-and-hold turbo gesture
- **WHEN** INPUT packets are transmitted
- **THEN** they MUST carry a boost flag of true for the duration of the gesture
