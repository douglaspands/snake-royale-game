## Purpose
Defines the timing contract of the server-authoritative game loop: how simulated time tracks real elapsed time, how the loop recovers from a slow tick without diverging or spiraling, and how snapshot delivery to connected clients stays bounded as player count grows.

## ADDED Requirements

### Requirement: REQ-LOOP-001 Fixed-Timestep Accumulation
The server's game loop MUST advance the physics simulation using a fixed timestep `dt` derived from the configured tick rate, and MUST accumulate the real elapsed time between loop iterations so that the number of simulation steps executed reflects actual elapsed wall-clock time rather than always exactly one step per iteration.

#### Scenario: Simulation keeps pace with elapsed time
- **WHEN** a loop iteration's own work (physics step plus broadcast) completes faster than `dt`
- **THEN** the loop waits out the remainder of `dt` before the next iteration, and exactly one simulation step has been applied for that interval

#### Scenario: Simulation catches up after a slow iteration
- **WHEN** a loop iteration's own work takes longer than one `dt` (a tick overrun)
- **THEN** the loop applies as many simulation steps as needed to consume the elapsed real time (bounded by REQ-LOOP-002), rather than silently advancing by only one fixed `dt` and letting simulated time fall behind real time

### Requirement: REQ-LOOP-002 Bounded Catch-Up (Spiral-of-Death Protection)
The server's game loop MUST cap both the maximum real-time gap it accounts for in a single iteration and the maximum number of consecutive simulation steps it will run to consume backlog, so that a sufficiently long stall degrades gracefully (dropping unsimulated backlog time) instead of causing the loop to fall permanently further behind on every subsequent iteration.

#### Scenario: A very long stall does not cause unbounded catch-up
- **WHEN** the real time elapsed since the previous iteration exceeds the loop's maximum accounted gap
- **THEN** the loop treats the excess as dropped (not simulated) rather than queuing it, and the number of simulation steps run in that iteration does not exceed the configured maximum catch-up steps

#### Scenario: Loop remains responsive after catch-up
- **WHEN** a stall has just been consumed via bounded catch-up
- **THEN** the very next iteration resumes normal single-step-per-tick pacing rather than continuing to run at the catch-up cap

### Requirement: REQ-LOOP-003 Concurrent Snapshot Broadcast
When broadcasting a `WORLD_SNAPSHOT` to multiple connected clients within a single tick, the server MUST dispatch the sends concurrently rather than sequentially waiting for each client's send to complete before starting the next, so that the per-tick cost of broadcasting does not grow linearly with connected player count in a way that risks tick overrun.

#### Scenario: One slow client does not delay delivery to others
- **GIVEN** multiple clients are connected and one client's connection is slow to accept writes
- **WHEN** the server broadcasts a WORLD_SNAPSHOT for the current tick
- **THEN** the other connected clients receive their snapshot without waiting for the slow client's send to complete
