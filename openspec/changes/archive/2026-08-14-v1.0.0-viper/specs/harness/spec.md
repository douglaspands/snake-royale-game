## Purpose
Deterministic, non-blocking test harness and quality gate infrastructure for Python backend and TypeScript frontend without real-time sleep.

## ADDED Requirements

### Requirement: REQ-HARN-001 Deterministic Virtual Clock
The test harness SHALL provide a virtual clock mechanism that advances simulation time in discrete steps without invoking real-time sleep functions.

#### Scenario: Deterministic physics stepping
- **WHEN** the virtual clock advances by delta time dt
- **THEN** all scheduled callbacks and physics ticks execute synchronously without wall-clock delay
