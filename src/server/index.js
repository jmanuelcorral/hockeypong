// Hockey Pong — Server Entry Point
// Express serves static files from src/client/
// WebSocket server handles multiplayer game rooms.

const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const { MSG, makeMsg, parseMsg } = require('../shared/protocol');
const CONSTANTS = require('../shared/constants');
const Physics = require('../shared/physics');

const PORT = process.env.PORT || 3000;

// --- Express setup ---
const app = express();
const server = http.createServer(app);

// Serve shared modules at /shared/ so the client can import them
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));

// Serve client static files
app.use(express.static(path.join(__dirname, '..', 'client')));

// --- WebSocket setup ---
const wss = new WebSocketServer({ server });

// Room storage: Map<roomId, Room>
const rooms = new Map();
// Reverse lookup: ws → roomId
const wsToRoom = new Map();

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let id = '';
  for (let i = 0; i < CONSTANTS.ROOM_CODE_LENGTH; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// --- Room class ---
class Room {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map(); // playerNumber → { ws, playerNumber, ready, direction }
    this.wsByPlayer = new Map(); // ws → playerNumber (reverse lookup)
    this.gameState = null;
    this.gameInterval = null;
    this.broadcastInterval = null;
    this.countdownTimer = null;
    this.phase = 'waiting'; // waiting | countdown | playing | scored | over
    this.lastActivity = Date.now();
  }

  addPlayer(ws) {
    const playerNumber = this.players.has(1) ? 2 : 1;
    const playerData = { ws, playerNumber, ready: false, direction: 'none' };
    this.players.set(playerNumber, playerData);
    this.wsByPlayer.set(ws, playerNumber);
    this.lastActivity = Date.now();
    return playerNumber;
  }

  removePlayer(ws) {
    const playerNumber = this.wsByPlayer.get(ws);
    if (playerNumber == null) return null;
    this.players.delete(playerNumber);
    this.wsByPlayer.delete(ws);
    this.lastActivity = Date.now();
    return playerNumber;
  }

  getPlayerNumber(ws) {
    return this.wsByPlayer.get(ws) || null;
  }

  getOpponent(playerNumber) {
    return this.players.get(playerNumber === 1 ? 2 : 1) || null;
  }

  bothPlayersPresent() {
    return this.players.has(1) && this.players.has(2);
  }

  bothPlayersReady() {
    const p1 = this.players.get(1);
    const p2 = this.players.get(2);
    return p1 && p2 && p1.ready && p2.ready;
  }

  broadcast(message) {
    for (const [, player] of this.players) {
      if (player.ws.readyState === 1) { // WebSocket.OPEN
        player.ws.send(message);
      }
    }
  }

  stopGameLoop() {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  startCountdown(onComplete) {
    this.phase = 'countdown';
    this.gameState = Physics.createGameState();
    this.gameState.phase = 'countdown';

    let remaining = CONSTANTS.COUNTDOWN_SECONDS;

    const tick = () => {
      this.broadcast(makeMsg(MSG.GAME_COUNTDOWN, { seconds: remaining }));
      if (remaining <= 0) {
        onComplete();
        return;
      }
      remaining--;
      this.countdownTimer = setTimeout(tick, 1000);
    };

    tick();
  }

  startGame() {
    this.phase = 'playing';
    this.gameState.phase = 'playing';
    Physics.launchPuck(this.gameState);

    // Notify both players
    for (const [playerNumber, player] of this.players) {
      if (player.ws.readyState === 1) {
        player.ws.send(makeMsg(MSG.GAME_START, { playerNumber }));
      }
    }

    this.startGameLoop();
  }

  startGameLoop() {
    // Main simulation loop at TICK_RATE (60 TPS)
    this.gameInterval = setInterval(() => {
      if (this.gameState.phase !== 'playing') return;

      // Gather inputs
      const inputs = {};
      const p1 = this.players.get(1);
      const p2 = this.players.get(2);
      if (p1) inputs[1] = p1.direction;
      if (p2) inputs[2] = p2.direction;

      // Run physics
      const result = Physics.update(this.gameState, inputs);

      if (result) {
        if (result.event === 'score') {
          this.handleScore(result.scorer);
        } else if (result.event === 'game_over') {
          this.handleGameOver(result.winner);
        }
      }
    }, CONSTANTS.TICK_INTERVAL);

    // State broadcast at STATE_BROADCAST_RATE (20 Hz)
    this.broadcastInterval = setInterval(() => {
      if (!this.gameState) return;

      const stateMsg = makeMsg(MSG.GAME_STATE, {
        puck: this.gameState.puck,
        paddles: this.gameState.paddles,
        scores: this.gameState.scores,
        tick: this.gameState.tick,
      });
      this.broadcast(stateMsg);
    }, CONSTANTS.STATE_BROADCAST_INTERVAL);
  }

  handleScore(scorer) {
    this.gameState.phase = 'scored';
    this.phase = 'scored';

    this.broadcast(makeMsg(MSG.SCORE, {
      scorer,
      scores: this.gameState.scores,
    }));

    // Stop game loop during reset
    this.stopGameLoop();

    // Reset puck and re-countdown after brief pause
    Physics.resetPuck(this.gameState);

    setTimeout(() => {
      if (this.players.size < 2) return; // someone left during pause

      this.startCountdown(() => {
        this.phase = 'playing';
        this.gameState.phase = 'playing';
        Physics.launchPuck(this.gameState);
        this.broadcast(makeMsg(MSG.GAME_START, {}));
        this.startGameLoop();
      });
    }, 1500);
  }

  handleGameOver(winner) {
    this.phase = 'over';
    this.stopGameLoop();

    this.broadcast(makeMsg(MSG.GAME_OVER, {
      winner,
      scores: this.gameState.scores,
    }));

    // Cleanup room after a short delay
    setTimeout(() => cleanupRoom(this.roomId), 3000);
  }

  isEmpty() {
    return this.players.size === 0;
  }
}

// --- Room management helpers ---
function cleanupRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.stopGameLoop();

  // Remove ws→room mappings for remaining players
  for (const [, player] of room.players) {
    wsToRoom.delete(player.ws);
  }

  rooms.delete(roomId);
}

// Periodic cleanup of idle/empty rooms
const roomCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms) {
    if (room.isEmpty() || (now - room.lastActivity > CONSTANTS.ROOM_TIMEOUT_MS)) {
      cleanupRoom(roomId);
    }
  }
}, 60000);

// --- WebSocket connection handler ---
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    const msg = parseMsg(raw);
    if (!msg) return;

    switch (msg.type) {
      case MSG.CREATE_ROOM: {
        // Prevent creating a room if already in one
        if (wsToRoom.has(ws)) {
          ws.send(makeMsg(MSG.ERROR, { message: 'Already in a room' }));
          break;
        }

        let roomId = generateRoomId();
        while (rooms.has(roomId)) roomId = generateRoomId();

        const room = new Room(roomId);
        const playerNumber = room.addPlayer(ws);
        rooms.set(roomId, room);
        wsToRoom.set(ws, roomId);

        ws.send(makeMsg(MSG.ROOM_CREATED, { roomId }));
        ws.send(makeMsg(MSG.ROOM_JOINED, { roomId, playerNumber }));
        break;
      }

      case MSG.JOIN_ROOM: {
        if (wsToRoom.has(ws)) {
          ws.send(makeMsg(MSG.ERROR, { message: 'Already in a room' }));
          break;
        }

        const { roomId } = msg;
        if (!roomId) {
          ws.send(makeMsg(MSG.ERROR, { message: 'Missing room ID' }));
          break;
        }

        const room = rooms.get(roomId.toUpperCase());
        if (!room) {
          ws.send(makeMsg(MSG.ERROR, { message: 'Room not found' }));
          break;
        }

        if (room.bothPlayersPresent()) {
          ws.send(makeMsg(MSG.ERROR, { message: 'Room is full' }));
          break;
        }

        const playerNumber = room.addPlayer(ws);
        wsToRoom.set(ws, room.roomId);

        // Notify the joiner
        ws.send(makeMsg(MSG.ROOM_JOINED, { roomId: room.roomId, playerNumber }));

        // Notify both players that opponent has joined
        room.broadcast(makeMsg(MSG.OPPONENT_JOINED, {}));
        break;
      }

      case MSG.PLAYER_INPUT: {
        const roomId = wsToRoom.get(ws);
        if (!roomId) break;

        const room = rooms.get(roomId);
        if (!room) break;

        const playerNumber = room.getPlayerNumber(ws);
        if (!playerNumber) break;

        const player = room.players.get(playerNumber);
        if (player && (msg.direction === 'left' || msg.direction === 'right' || msg.direction === 'none')) {
          player.direction = msg.direction;
          room.lastActivity = Date.now();
        }
        break;
      }

      case MSG.PLAYER_READY: {
        const roomId = wsToRoom.get(ws);
        if (!roomId) break;

        const room = rooms.get(roomId);
        if (!room) break;

        const playerNumber = room.getPlayerNumber(ws);
        if (!playerNumber) break;

        const player = room.players.get(playerNumber);
        if (player) player.ready = true;

        // Start countdown if both players are ready
        if (room.bothPlayersReady() && room.phase === 'waiting') {
          room.startCountdown(() => {
            room.startGame();
          });
        }
        break;
      }

      default:
        ws.send(makeMsg(MSG.ERROR, { message: 'Unknown message type' }));
    }
  });

  ws.on('close', () => {
    const roomId = wsToRoom.get(ws);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) {
      wsToRoom.delete(ws);
      return;
    }

    const removedPlayerNumber = room.removePlayer(ws);
    wsToRoom.delete(ws);

    if (removedPlayerNumber != null) {
      // Stop game if running
      room.stopGameLoop();

      // Notify opponent
      const opponent = room.getOpponent(removedPlayerNumber);
      if (opponent && opponent.ws.readyState === 1) {
        opponent.ws.send(makeMsg(MSG.OPPONENT_LEFT, {}));
      }

      // Reset room state so remaining player can get a new opponent
      room.phase = 'waiting';
      if (room.players.size > 0) {
        for (const [, p] of room.players) {
          p.ready = false;
          p.direction = 'none';
        }
      }
    }

    // Clean up empty rooms immediately
    if (room.isEmpty()) {
      cleanupRoom(roomId);
    }
  });
});

// Heartbeat to detect dead connections
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeat);
  clearInterval(roomCleanupInterval);
});

// --- Start ---
server.listen(PORT, () => {
  console.log(`Hockey Pong server running on http://localhost:${PORT}`);
});
