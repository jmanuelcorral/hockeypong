# Rinzler — History

## Core Context
- **Project:** Hockey Pong — 2D pixel art multiplayer hockey pong game
- **Stack:** Node.js, WebSockets
- **User:** Jose Corral
- **Created:** 2026-03-12

## Learnings
- Project initialized. No code yet.
- **[2026-03-12 Flynn handoff]** Architecture decisions finalized by Flynn. Server responsibilities: room management, 60 TPS game loop, WebSocket message handlers, 20 Hz state broadcasting. Server-authoritative physics. See `.squad/decisions.md` for full protocol and constants.
- **[2026-03-12 Server impl]** Full multiplayer server implemented in `src/server/index.js`:
  - Room class encapsulates all per-game state (players, gameState, intervals, phase)
  - `wsToRoom` Map provides O(1) reverse lookup from WebSocket → roomId for disconnect handling
  - Room IDs are case-insensitive (uppercased on join) using unambiguous charset
  - Game lifecycle: waiting → countdown (3,2,1,0 at 1s intervals) → playing → scored (1.5s pause, re-countdown) → over
  - Game loop: 60 TPS physics via setInterval, 20 Hz state broadcast via separate setInterval
  - Score handling stops both intervals, resets puck, pauses 1.5s, then re-countdowns before resuming
  - Disconnect stops game loop, notifies opponent with OPPONENT_LEFT, resets room to 'waiting' so remaining player could get a new opponent
  - Room cleanup: immediate on empty, periodic sweep every 60s for idle rooms (5min timeout)
  - CREATE_ROOM sends both ROOM_CREATED and ROOM_JOINED to the creator
  - Input validation: only 'left'/'right'/'none' accepted, prevents duplicate room joins
  - All 6 integration tests pass: create, join, countdown+start+broadcast, input, disconnect, invalid-room error

