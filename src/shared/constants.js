// Hockey Pong — Game Constants
// Shared between client and server. All units in pixels unless noted.

const CONSTANTS = {
  // --- Canvas ---
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 500,

  // --- Rink ---
  RINK_PADDING: 30,           // padding from canvas edge to rink walls
  GOAL_WIDTH: 200,            // goal opening, centered on top/bottom walls
  CORNER_RADIUS: 40,          // rounded rink corners

  // --- Paddles ---
  PADDLE_WIDTH: 100,          // horizontal paddles (move left/right)
  PADDLE_HEIGHT: 14,
  PADDLE_SPEED: 7,            // pixels per tick
  PADDLE_OFFSET: 40,          // distance from goal line to paddle center

  // --- Puck ---
  PUCK_RADIUS: 8,
  PUCK_SPEED_INITIAL: 5,      // pixels per tick at game start
  PUCK_SPEED_MAX: 12,         // max speed after acceleration
  PUCK_ACCELERATION: 0.15,    // speed increase per paddle hit

  // --- Game rules ---
  SCORE_TO_WIN: 7,
  COUNTDOWN_SECONDS: 3,       // countdown before puck launch

  // --- Timing ---
  TICK_RATE: 60,               // server ticks per second
  get TICK_INTERVAL() { return 1000 / this.TICK_RATE; },

  // --- Network ---
  STATE_BROADCAST_RATE: 20,    // state updates sent to clients per second
  get STATE_BROADCAST_INTERVAL() { return 1000 / this.STATE_BROADCAST_RATE; },

  // --- Room ---
  ROOM_CODE_LENGTH: 6,
  ROOM_TIMEOUT_MS: 5 * 60 * 1000,  // 5 min idle timeout

  // --- AI ---
  AI_REACTION_DELAY: 6,       // ticks of delay before AI reacts to puck direction change
  AI_ACCURACY: 0.85,          // 0-1, how precisely AI tracks the puck (1 = perfect)
  AI_MISTAKE_CHANCE: 0.03,    // chance per tick AI moves the wrong direction
};

// Support both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONSTANTS;
}
