// Hockey Pong — Shared Physics
// Core movement and collision logic used by both client (single player) and server (multiplayer).

if (typeof require !== 'undefined' && typeof module !== 'undefined') {
  var CONSTANTS = require('./constants');
}

var Physics = {
  // Create initial game state
  createGameState() {
    const cx = CONSTANTS.CANVAS_WIDTH / 2;
    const cy = CONSTANTS.CANVAS_HEIGHT / 2;

    return {
      puck: {
        x: cx,
        y: cy,
        vx: 0,
        vy: 0,
        speed: CONSTANTS.PUCK_SPEED_INITIAL,
      },
      paddles: {
        1: { x: cx, y: CONSTANTS.RINK_PADDING + CONSTANTS.PADDLE_OFFSET },
        2: { x: cx, y: CONSTANTS.CANVAS_HEIGHT - CONSTANTS.RINK_PADDING - CONSTANTS.PADDLE_OFFSET },
      },
      scores: { 1: 0, 2: 0 },
      tick: 0,
      phase: 'waiting', // waiting | countdown | playing | scored | over
    };
  },

  // Launch the puck in a random direction toward one player
  launchPuck(state) {
    const angle = (Math.random() * Math.PI / 3) + Math.PI / 3; // 60°–120° range
    const direction = Math.random() < 0.5 ? 1 : -1; // toward player 1 (up) or 2 (down)
    state.puck.vx = Math.cos(angle) * state.puck.speed * (Math.random() < 0.5 ? 1 : -1);
    state.puck.vy = Math.sin(angle) * state.puck.speed * direction;
  },

  // Move a paddle based on input direction
  movePaddle(paddle, direction) {
    const rinkLeft = CONSTANTS.RINK_PADDING + CONSTANTS.PADDLE_WIDTH / 2;
    const rinkRight = CONSTANTS.CANVAS_WIDTH - CONSTANTS.RINK_PADDING - CONSTANTS.PADDLE_WIDTH / 2;

    if (direction === 'left') {
      paddle.x = Math.max(rinkLeft, paddle.x - CONSTANTS.PADDLE_SPEED);
    } else if (direction === 'right') {
      paddle.x = Math.min(rinkRight, paddle.x + CONSTANTS.PADDLE_SPEED);
    }
  },

  // Check and resolve puck-paddle collision
  checkPaddleCollision(puck, paddle) {
    const halfW = CONSTANTS.PADDLE_WIDTH / 2;
    const halfH = CONSTANTS.PADDLE_HEIGHT / 2;
    const r = CONSTANTS.PUCK_RADIUS;

    if (
      puck.x + r > paddle.x - halfW &&
      puck.x - r < paddle.x + halfW &&
      puck.y + r > paddle.y - halfH &&
      puck.y - r < paddle.y + halfH
    ) {
      // Reverse vertical direction
      puck.vy = -puck.vy;

      // Angle based on where puck hit the paddle (offset from center)
      const offset = (puck.x - paddle.x) / halfW; // -1 to 1
      puck.vx = offset * puck.speed * 0.8;

      // Increase speed
      puck.speed = Math.min(CONSTANTS.PUCK_SPEED_MAX, puck.speed + CONSTANTS.PUCK_ACCELERATION);

      // Normalize velocity to match new speed
      const mag = Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy);
      if (mag > 0) {
        puck.vx = (puck.vx / mag) * puck.speed;
        puck.vy = (puck.vy / mag) * puck.speed;
      }

      // Push puck out of paddle to avoid repeat collisions
      if (puck.vy < 0) {
        puck.y = paddle.y - halfH - r;
      } else {
        puck.y = paddle.y + halfH + r;
      }

      return true;
    }
    return false;
  },

  // Check wall collisions (left/right rink walls) and goals (top/bottom)
  checkWallCollision(puck) {
    const left = CONSTANTS.RINK_PADDING + CONSTANTS.PUCK_RADIUS;
    const right = CONSTANTS.CANVAS_WIDTH - CONSTANTS.RINK_PADDING - CONSTANTS.PUCK_RADIUS;
    const top = CONSTANTS.RINK_PADDING + CONSTANTS.PUCK_RADIUS;
    const bottom = CONSTANTS.CANVAS_HEIGHT - CONSTANTS.RINK_PADDING - CONSTANTS.PUCK_RADIUS;
    const goalLeft = (CONSTANTS.CANVAS_WIDTH - CONSTANTS.GOAL_WIDTH) / 2;
    const goalRight = (CONSTANTS.CANVAS_WIDTH + CONSTANTS.GOAL_WIDTH) / 2;

    // Side walls — bounce
    if (puck.x <= left) {
      puck.x = left;
      puck.vx = Math.abs(puck.vx);
    } else if (puck.x >= right) {
      puck.x = right;
      puck.vx = -Math.abs(puck.vx);
    }

    // Top wall — check for goal (Player 1's goal is at the top)
    if (puck.y <= top) {
      if (puck.x >= goalLeft && puck.x <= goalRight) {
        return 2; // Player 2 scored
      }
      puck.y = top;
      puck.vy = Math.abs(puck.vy);
    }

    // Bottom wall — check for goal (Player 2's goal is at the bottom)
    if (puck.y >= bottom) {
      if (puck.x >= goalLeft && puck.x <= goalRight) {
        return 1; // Player 1 scored
      }
      puck.y = bottom;
      puck.vy = -Math.abs(puck.vy);
    }

    return 0; // no goal
  },

  // Advance game state by one tick
  update(state, inputs) {
    if (state.phase !== 'playing') return null;

    state.tick++;

    // Move paddles based on inputs
    if (inputs[1]) Physics.movePaddle(state.paddles[1], inputs[1]);
    if (inputs[2]) Physics.movePaddle(state.paddles[2], inputs[2]);

    // Move puck
    state.puck.x += state.puck.vx;
    state.puck.y += state.puck.vy;

    // Paddle collisions
    Physics.checkPaddleCollision(state.puck, state.paddles[1]);
    Physics.checkPaddleCollision(state.puck, state.paddles[2]);

    // Wall collisions and goal detection
    const scorer = Physics.checkWallCollision(state.puck);
    if (scorer) {
      state.scores[scorer]++;
      if (state.scores[scorer] >= CONSTANTS.SCORE_TO_WIN) {
        state.phase = 'over';
        return { event: 'game_over', winner: scorer };
      }
      state.phase = 'scored';
      return { event: 'score', scorer };
    }

    return null;
  },

  // Reset puck to center after a goal
  resetPuck(state) {
    state.puck.x = CONSTANTS.CANVAS_WIDTH / 2;
    state.puck.y = CONSTANTS.CANVAS_HEIGHT / 2;
    state.puck.vx = 0;
    state.puck.vy = 0;
    state.puck.speed = CONSTANTS.PUCK_SPEED_INITIAL;
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Physics;
}
if (typeof window !== 'undefined') {
  window.Physics = Physics;
}
