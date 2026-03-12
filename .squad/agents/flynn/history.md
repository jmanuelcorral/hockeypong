# Flynn — History

## Core Context
- **Project:** Hockey Pong — 2D pixel art multiplayer hockey pong game
- **Stack:** HTML5 Canvas, JS/TS, Node.js, WebSockets
- **User:** Jose Corral
- **Created:** 2026-03-12

## Learnings
- Project initialized. No code yet.
- **Stack decision:** Vanilla JS only — no TypeScript, no bundler, no build step. Shared code uses `module.exports` + global pattern for Node/browser dual-use.
- **Architecture:** Client/server split. Single-player runs entirely client-side (physics + AI in browser). Multiplayer is server-authoritative with 60 TPS tick rate, 20 Hz state broadcast.
- **Game layout:** Top-down hockey rink. Player 1 (top, AI/remote), Player 2 (bottom, human/local). Horizontal paddles, puck bounces off side walls, scores through goal openings.
- **WebSocket protocol:** JSON messages `{ type, ...payload }`. Types defined in `src/shared/protocol.js`. Helpers: `makeMsg()` and `parseMsg()`.
- **Physics engine:** `src/shared/physics.js` — shared between client (single-player) and server (multiplayer). Handles paddle movement, puck collision, wall bounce, goal detection.
- **AI design:** Reactive with intentional imperfection — reaction delay (6 ticks), 85% accuracy, 3% mistake chance. Predicts puck intercept with linear projection. Drifts to center when puck goes away.
- **Room management:** 6-char codes (no ambiguous chars), invite via `?room=XXXXXX` URL param, 5 min idle timeout.
- **Key file paths:**
  - `src/shared/constants.js` — all game tuning values
  - `src/shared/protocol.js` — message types
  - `src/shared/physics.js` — shared physics engine
  - `src/server/index.js` — Express + WebSocket server (skeleton, Rinzler fills in)
  - `src/client/index.html` — HTML shell
  - `src/client/js/game.js` — game controller (Quorra fills in)
  - `src/client/js/renderer.js` — canvas rendering
  - `src/client/js/ai.js` — AI opponent
  - `src/client/js/input.js` — keyboard input
  - `src/client/js/network.js` — WebSocket client
  - `src/client/css/style.css` — pixel art styling
- **Dependencies:** `express` ^4.21.0, `ws` ^8.18.0. Dev: `node --watch` for hot reload.
- **User preference:** Jose wants it fun and snappy. Keep it simple and practical.
- **Volta issue:** npm via Volta has path issues on this machine. Use the node-bundled npm at `C:\Users\josecorral\AppData\Local\Volta\tools\image\node\22.13.0\npm.cmd` if Volta npm fails.
