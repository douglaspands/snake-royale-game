## Purpose
Input sequencing for client-side prediction reconciliation.

## MODIFIED Requirements

### Requirement: REQ-PROTO-003 Player Input Stream (INPUT)
The client SHALL stream input packets to the server containing target heading angle in radians, boost flag, and input sequence number.

#### Scenario: Input stream dispatch
- **WHEN** player directs angle or toggles boost
- **THEN** INPUT packet with monotonic sequence number is sent to the server
