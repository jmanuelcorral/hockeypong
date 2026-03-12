// Hockey Pong — WebSocket Protocol Definitions
// Shared between client and server.
//
// All messages are JSON: { type: MSG_TYPE, ...payload }

var MSG = {
  // --- Client → Server ---
  CREATE_ROOM:    'CREATE_ROOM',     // {} — request a new room
  JOIN_ROOM:      'JOIN_ROOM',       // { roomId } — join existing room via invite
  PLAYER_INPUT:   'PLAYER_INPUT',    // { direction: 'left'|'right'|'none', seq }
  PLAYER_READY:   'PLAYER_READY',    // {} — player signals ready to start

  // --- Server → Client ---
  ROOM_CREATED:   'ROOM_CREATED',    // { roomId }
  ROOM_JOINED:    'ROOM_JOINED',     // { roomId, playerNumber: 1|2 }
  OPPONENT_JOINED:'OPPONENT_JOINED', // {} — the other player connected
  OPPONENT_LEFT:  'OPPONENT_LEFT',   // {} — the other player disconnected
  GAME_COUNTDOWN: 'GAME_COUNTDOWN', // { seconds } — countdown tick
  GAME_START:     'GAME_START',      // { playerNumber }
  GAME_STATE:     'GAME_STATE',      // { puck, paddles, scores, tick }
  SCORE:          'SCORE',           // { scorer: 1|2, scores }
  GAME_OVER:      'GAME_OVER',      // { winner: 1|2, scores }
  ERROR:          'ERROR',           // { message }
};

// Helper to build a message object
function makeMsg(type, payload = {}) {
  return JSON.stringify({ type, ...payload });
}

// Helper to parse incoming message
function parseMsg(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MSG, makeMsg, parseMsg };
}
if (typeof window !== 'undefined') {
  window.MSG = MSG;
  window.makeMsg = makeMsg;
  window.parseMsg = parseMsg;
}
