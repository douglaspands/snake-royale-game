## Purpose
Deterministic, non-blocking test harness and quality gate infrastructure for Python backend and TypeScript frontend without real-time sleep.

## Requirements

### Requirement: REQ-HARN-001 Deterministic Virtual Clock
The test harness SHALL provide a virtual clock mechanism that advances simulation time in discrete steps without invoking real-time sleep functions.

#### Scenario: Deterministic physics stepping
- **WHEN** the virtual clock advances by delta time dt
- **THEN** all scheduled callbacks and physics ticks execute synchronously without wall-clock delay

### Requirement: REQ-HARN-002 JSON Schema Packet Validation
The test harness SHALL strictly validate all WebSocket message payloads against Draft-07 JSON schemas defined in the protocol specification.

#### Scenario: Valid packet validation
- **WHEN** a valid packet payload is checked
- **THEN** the schema validator confirms compliance without errors

#### Scenario: Invalid packet rejection
- **WHEN** an invalid packet payload with missing required fields is checked
- **THEN** the schema validator raises a validation error

### Requirement: REQ-HARN-003 Mock Network Client Simulator
The test harness SHALL provide an in-memory client connection simulator capable of buffering incoming broadcast packets and asserting state deltas.

#### Scenario: Mock client message flow
- **WHEN** the server broadcasts a message to the mock client
- **THEN** the packet is buffered in memory for test assertions

### Requirement: REQ-HARN-004 Headless Canvas Mock and Touch Simulator
The frontend test harness SHALL provide mocks for HTMLCanvasElement, CanvasRenderingContext2D, and PointerEvents simulation.

#### Scenario: Headless canvas rendering
- **WHEN** renderer draw calls execute in test environment
- **THEN** canvas operations are recorded without requiring a real browser DOM

### Requirement: REQ-HARN-005 Code Coverage Gate
Automated test suites MUST maintain a minimum of 80% line and statement coverage across both backend and frontend production source code.

#### Scenario: Test suite coverage check
- **WHEN** pytest or vitest runs with coverage measurement
- **THEN** total coverage meets or exceeds 80%

### Requirement: REQ-HARN-006 Static Quality Gate
The Python backend SHALL maintain 100% compliance with ruff linting, ruff formatting, and ty typechecking with zero errors.

#### Scenario: Backend quality verification
- **WHEN** static analysis tools ruff and ty are executed
- **THEN** all checks pass with exit code 0

### Requirement: REQ-HARN-007 PR-Only CI Status Gate Execution
The Continuous Integration pipeline on GitHub Actions SHALL execute quality gates exclusively on Pull Request events targeting protected branches (`main`, `master`) and manual workflow dispatches, omitting redundant execution on direct push or merge commits.

#### Scenario: Pull Request quality gate triggering
- **WHEN** a Pull Request targeting `main` or `master` is opened, synchronized, or reopened
- **THEN** GitHub Actions runs OpenSpec validation, backend tests, static linters, and frontend tests as required status checks

#### Scenario: Post-merge push execution prevention
- **WHEN** a Pull Request is merged into `main` or `master`
- **THEN** the CI workflow does NOT trigger a redundant push job, conserving runner resources
