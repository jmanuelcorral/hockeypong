// Hockey Pong — AI Opponent
// Runs client-side for single-player mode.
// Player 1 (top) is the AI, Player 2 (bottom) is the human.

const AI = (() => {
  let reactionTimer = 0;
  let targetX = CONSTANTS.CANVAS_WIDTH / 2;
  let lastPuckVy = 0;

  function reset() {
    reactionTimer = 0;
    targetX = CONSTANTS.CANVAS_WIDTH / 2;
    lastPuckVy = 0;
  }

  function update(state) {
    const puck = state.puck;
    const paddle = state.paddles[1]; // AI is player 1

    // Detect puck direction change
    if (Math.sign(puck.vy) !== Math.sign(lastPuckVy)) {
      reactionTimer = CONSTANTS.AI_REACTION_DELAY;
    }
    lastPuckVy = puck.vy;

    // Wait during reaction delay
    if (reactionTimer > 0) {
      reactionTimer--;
      return 'none';
    }

    // Only actively track when puck is heading toward AI (upward, vy < 0)
    if (puck.vy < 0) {
      // Predict where puck will be at AI's y-level (simple linear projection)
      const timeToReach = (paddle.y - puck.y) / puck.vy;
      if (timeToReach > 0) {
        targetX = puck.x + puck.vx * timeToReach;
        // Clamp to rink bounds
        targetX = Math.max(CONSTANTS.RINK_PADDING, Math.min(CONSTANTS.CANVAS_WIDTH - CONSTANTS.RINK_PADDING, targetX));
      }

      // Apply accuracy jitter
      const jitter = (1 - CONSTANTS.AI_ACCURACY) * CONSTANTS.PADDLE_WIDTH;
      targetX += (Math.random() - 0.5) * jitter;
    } else {
      // Puck going away — drift back toward center
      targetX = CONSTANTS.CANVAS_WIDTH / 2;
    }

    // Random mistakes
    if (Math.random() < CONSTANTS.AI_MISTAKE_CHANCE) {
      return Math.random() < 0.5 ? 'left' : 'right';
    }

    // Move toward target
    const diff = targetX - paddle.x;
    const deadZone = CONSTANTS.PADDLE_WIDTH * 0.1;

    if (diff < -deadZone) return 'left';
    if (diff > deadZone) return 'right';
    return 'none';
  }

  return { reset, update };
})();
