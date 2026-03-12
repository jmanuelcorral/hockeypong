# Decisions

*Team decisions log. Append-only.*

---

## Architecture Decision: Hockey Pong Foundation

**Author:** Flynn (Lead)  
**Date:** 2026-03-12  
**Status:** Accepted  

### Overview

Hockey Pong is a 2D pixel-art pong game with a hockey rink aesthetic. Two modes: single-player (vs AI) and multiplayer (2 players via WebSocket, invite link). Vanilla JavaScript — no build step, no bundler, no TypeScript.

### Architecture

#### Directory Structure
```
src/
  client/           — browser code, served as static files
    index.html      — HTML shell with canvas + screens
    css/style.css   — pixel art styling (Press Start 2P font)
    js/game.js      — game controller, screen management, main loop
    js/renderer.js  — canvas rendering (rink, paddles, puck, effects)
    js/input.js     — keyboard input capture
    js/ai.js        — AI opponent (client-side, single-player only)
    js/network.js   — WebSocket client wrapper
  server/
    index.js        — Express + WebSocket server
  shared/
    constants.js    — all game constants (canvas, physics, timing, rules)
    protocol.js     — WebSocket message type definitions + helpers
    physics.js      — shared physics engine (collision, movement, state)
package.json
```

#### Client/Server Split
- **Single-player:** Runs entirely client-side. Physics, AI, rendering all in browser. No server needed for gameplay.
- **Multiplayer:** Server-authoritative. Server runs physics at 60 TPS. Clients send input, server broadcasts state at 20 Hz. Clients render and interpolate.

#### Shared Code
`src/shared/` files use `module.exports` for Node.js and expose globals for browser (loaded via `<script>` tags). No bundler required.

### WebSocket Protocol

JSON format: `{ type: "MSG_TYPE", ...payload }`

#### Client → Server
| Type | Payload | Purpose |
|------|---------|---------|
| `CREATE_ROOM` | `{}` | Request new game room |
| `JOIN_ROOM` | `{ roomId }` | Join existing room |
| `PLAYER_INPUT` | `{ direction, seq }` | Send paddle movement |
| `PLAYER_READY` | `{}` | Signal ready to play |

#### Server → Client
| Type | Payload | Purpose |
|------|---------|---------|
| `ROOM_CREATED` | `{ roomId }` | Room created confirmation |
| `ROOM_JOINED` | `{ roomId, playerNumber }` | Joined room, assigned player # |
| `OPPONENT_JOINED` | `{}` | Other player connected |
| `OPPONENT_LEFT` | `{}` | Other player disconnected |
| `GAME_COUNTDOWN` | `{ seconds }` | Countdown before puck launch |
| `GAME_START` | `{ playerNumber }` | Game begins |
| `GAME_STATE` | `{ puck, paddles, scores, tick }` | Authoritative state update |
| `SCORE` | `{ scorer, scores }` | Goal scored |
| `GAME_OVER` | `{ winner, scores }` | Game finished |
| `ERROR` | `{ message }` | Error message |

### State Sync Strategy

1. **Server-authoritative** — server runs physics, broadcasts state.
2. **Input forwarding** — clients send direction (`left`/`right`/`none`) each tick.
3. **State broadcast at 20 Hz** — full state snapshot sent 20 times/sec (lower than 60 TPS tick rate to save bandwidth).
4. **No client prediction** (v1) — keep it simple. If latency is noticeable, we add prediction later.
5. **Interpolation** — client smoothly interpolates between received states for visual smoothness.

### Key Constants & Rationale

| Constant | Value | Why |
|----------|-------|-----|
| Canvas | 800×500 | Widescreen ratio, fits rink shape well |
| Paddle | 100×14 | Wide enough to be forgiving, thin for pixel look |
| Puck radius | 8 | Visible but not huge |
| Puck speed | 5→12 | Starts gentle, ramps up with each hit for tension |
| Tick rate | 60 TPS | Smooth physics, matches typical display refresh |
| State broadcast | 20 Hz | Good enough for feel, 3x less bandwidth than 60 |
| Score to win | 7 | Long enough to be a real match, short enough to be snappy |
| Goal width | 200 | ~25% of canvas width, balanced difficulty |

### AI Strategy (Single Player)

The AI controls Player 1 (top paddle). Design goals: beatable but fun.

1. **Puck tracking:** AI predicts where the puck will cross its Y-level using linear projection.
2. **Reaction delay:** 6-tick delay when puck changes direction. Makes AI feel human.
3. **Accuracy jitter:** 85% accuracy — adds slight random offset to target position.
4. **Mistake chance:** 3% per tick chance of moving the wrong direction. Creates openings.
5. **Retreat behavior:** When puck heads away, AI drifts back to center. Doesn't chase blindly.
6. **Scalable difficulty:** All parameters (delay, accuracy, mistakes) can be tuned for difficulty levels.

### Room/Session Management

- **Room IDs:** 6-character alphanumeric (no ambiguous chars like 0/O/1/I/L).
- **Invite link:** `?room=XXXXXX` — auto-joins on page load.
- **Room lifecycle:** `created → waiting → playing → scored → playing → ... → over`
- **Auto-cleanup:** Rooms timeout after 5 min idle. Cleaned up on game over or player disconnect.
- **Max 2 players per room.** Third connection attempt gets an error.

### Game Layout

The game uses a **top-down hockey rink** view:
- Player 1 (AI or remote) at the **top** — defends top goal.
- Player 2 (human/local) at the **bottom** — defends bottom goal.
- Paddles move **horizontally** (left/right).
- Puck bounces off side walls, scores through goal openings at top/bottom.
- Goals are centered openings in the top and bottom rink walls (200px wide).

### Assignments

- **Quorra:** Implement client game loop, flesh out renderer, screen transitions, multiplayer client integration. Polish the single-player experience.
- **Rinzler:** Implement server room management, game loop, WebSocket message handlers, state broadcasting. Wire up the multiplayer backend.

---

## Decision: Server Implementation Patterns

**Author:** Rinzler  
**Date:** 2026-03-12  
**Status:** Implemented

### Summary

Full multiplayer server backend implemented in `src/server/index.js`. Key architectural decisions:

### Room Lifecycle
- Room phases: `waiting` → `countdown` → `playing` → `scored` → `over`
- On score: game loop stops, 1.5s pause, then full re-countdown before resuming play
- On game over: 3s delay before room cleanup (lets clients show results)
- Disconnect resets room to `waiting` (remaining player could theoretically get a new opponent)

### Networking
- `wsToRoom` reverse-lookup Map for O(1) disconnect → room resolution
- CREATE_ROOM sends both ROOM_CREATED and ROOM_JOINED (player 1 assignment) to creator
- JOIN_ROOM is case-insensitive (room IDs uppercased on lookup)
- OPPONENT_JOINED broadcast goes to both players on join

### Game Loop
- Two separate intervals: physics at 60 TPS, state broadcast at 20 Hz
- Both intervals are stopped and restarted on score events to avoid stale ticks during pause
- Server gathers player inputs each tick from stored `direction` field (set by PLAYER_INPUT handler)

### Cleanup
- Empty rooms cleaned immediately on last player disconnect
- Periodic sweep every 60s catches idle rooms (ROOM_TIMEOUT_MS = 5 min)
- Game over triggers delayed cleanup after 3s

### Validation
- Duplicate room join prevention (already-in-room check)
- Input direction whitelist: only 'left', 'right', 'none' accepted
- Room-full and room-not-found error responses

---
