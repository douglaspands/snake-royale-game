## Why
Modern web browsers are capable of high-performance 2D rendering and low-latency bidirectional communication. However, multiplayer web games often suffer from inconsistent physics, client-side desync, lack of mobile touch support, and unmaintainable monolithic codebases without test harnesses.

This proposal establishes the greenfield development of Snake Battle Royale Multiplayer, implementing a Server-Authoritative architecture with Python FastAPI, HTML5 Canvas 2D with TypeScript, virtual joystick controls, and a sub-2-second deterministic test harness.

## What Changes
- Greenfield implementation of real-time multiplayer snake battle royale.
- Authoritative Python backend with FastAPI and WebSockets.
- Client-side Canvas 2D renderer and input controllers.
- Deterministic zero-sleep test harness for backend and frontend.

## Capabilities

### New Capabilities
- `harness`: Deterministic test harness and simulation clock without real-time sleep.
- `lifecycle`: Player and room state machines and spawn management.
- `physics`: Server-authoritative 2D snake kinematics and spatial collisions.
- `protocol`: Typed WebSocket packet definitions and schemas.
- `rendering`: Canvas 2D interpolation and camera tracking pipeline.

### Modified Capabilities

## Impact
- Greenfield codebase setup covering backend (server/), frontend (client/), and specs.
