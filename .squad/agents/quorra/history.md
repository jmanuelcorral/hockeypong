# Quorra — History

## Core Context
- **Project:** Hockey Pong — 2D pixel art multiplayer hockey pong game
- **Stack:** HTML5 Canvas, JS/TS
- **User:** Jose Corral
- **Created:** 2026-03-12

## Learnings
- Project initialized. No code yet.
- **[2026-03-12 Flynn handoff]** Architecture decisions finalized by Flynn. Client responsibilities: game loop, renderer flesh-out, screen transitions, multiplayer client integration. Single-player runs entirely client-side with AI opponent. Multiplayer uses WebSocket for input/state sync. See `.squad/decisions.md` for full protocol and constants.
- **[2026-03-12 Rinzler server complete]** Backend fully implemented: Room class, 60 TPS physics loop, 20 Hz state broadcast, message handlers, game lifecycle, disconnect/cleanup. Multiplayer now playable. Client integration complete: PLAYER_READY sent on OPPONENT_JOINED to trigger countdown.
- **[Browser globals fix]** `const` at top-level in `<script>` tags creates a global lexical binding but does NOT attach to `window`. `physics.js` was reading `window.CONSTANTS` which was `undefined`, causing `createGameState()` to crash. Fix: all shared files (`constants.js`, `protocol.js`, `physics.js`) now explicitly set `window.*` for their exports in browser context. Pattern: `if (typeof window !== 'undefined') window.X = X;` alongside existing `module.exports` for Node.js. Client files (`game.js`, `renderer.js`, `input.js`, `ai.js`, `network.js`) access globals directly (not via `window.*`) and were not affected.

