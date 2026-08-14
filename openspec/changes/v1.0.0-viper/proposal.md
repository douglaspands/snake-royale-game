# OpenSpec Proposal: v1.0.0-VIPER — Snake Battle Royale Multiplayer
**Change ID:** `v1.0.0-viper`  
**Author:** AI Pair Programmer & Lead Engineer  
**Status:** `APPROVED`  

---

## 1. Intent & Problem Statement
Modern web browsers are capable of high-performance 2D rendering and low-latency bidirectional communication. However, multiplayer web games often suffer from inconsistent physics, client-side desync, lack of mobile touch support, and unmaintainable monolithic codebases without test harnesses.

This proposal establishes the full greenfield development of **Snake Battle Royale Multiplayer**, implementing a clean *Server-Authoritative* architecture with Python FastAPI + uv, pure HTML5 Canvas 2D with TypeScript + Vite, comprehensive multi-touch virtual joystick controls, and a sub-2-second deterministic test harness.

---

## 2. Scope & Target Capabilities
- **Real-Time Multiplayer:** WebSocket-based room management with 30-40 Hz server tick rate and 60-120 FPS client rendering.
- **Cross-Platform Controls:** Dual input pipeline supporting Desktop (Mouse / WASD) and Mobile/Tablet (Dynamic Floating Virtual Joystick with multi-touch support).
- **Smooth Interpolation:** Client-side LERP with snapshot buffer to eliminate stutter and jitter.
- **Deterministic Test Harness:** Complete mock layers on backend and frontend for rapid, sleep-free CI verification.
- **Single-Command Production Run:** FastAPI serving both WebSocket APIs and bundled frontend assets.

---

## 3. User Stories

### Story 1: Desktop Player
*As a desktop player, I want to steer my snake smoothly using mouse cursor direction or WASD and hold Space for turbo, so that I can trap opponents and compete on the leaderboard.*

### Story 2: Mobile/Tablet Player
*As a mobile player, I want to touch anywhere on the left side of the screen to summon a floating virtual joystick and tap a dedicated boost button, so that I have precise ergonomic control on touchscreens.*

### Story 3: System Administrator / Developer
*As a developer, I want to launch the entire game server with `uv run uvicorn server.app.main:app --host 0.0.0.0 --port 8000` and run all tests deterministically in $<2$ seconds, so that deployment and verification are instant.*

---

## 4. Success Criteria
1. Backend test suite passes 100% with `uv run pytest` in $<2.0\text{s}$.
2. Frontend test suite passes 100% with `npm test` in $<2.0\text{s}$.
3. Zero `time.sleep()` in test suites.
4. Single-command execution serves working HTML5 Canvas game on port 8000.
5. All OpenSpec contracts and JSON schemas are strictly honored.
