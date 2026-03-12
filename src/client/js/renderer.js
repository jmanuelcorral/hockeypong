// Hockey Pong — Canvas Renderer
// Pixel art style rendering of rink, paddles, puck, and effects.

const Renderer = (() => {
  let canvas, ctx;

  function init(canvasElement) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; // pixel art crisp
  }

  function clear() {
    ctx.fillStyle = '#0f1923';
    ctx.fillRect(0, 0, CONSTANTS.CANVAS_WIDTH, CONSTANTS.CANVAS_HEIGHT);
  }

  function drawRink() {
    const p = CONSTANTS.RINK_PADDING;
    const w = CONSTANTS.CANVAS_WIDTH;
    const h = CONSTANTS.CANVAS_HEIGHT;
    const r = CONSTANTS.CORNER_RADIUS;
    const goalW = CONSTANTS.GOAL_WIDTH;
    const goalLeft = (w - goalW) / 2;
    const goalRight = (w + goalW) / 2;

    ctx.strokeStyle = '#1a4a5a';
    ctx.lineWidth = 2;

    // Rink outline with goal openings
    ctx.beginPath();
    // Top-left corner
    ctx.moveTo(p + r, p);
    // Top wall — left of goal
    ctx.lineTo(goalLeft, p);
    // Goal opening (top) — no line drawn
    ctx.moveTo(goalRight, p);
    // Top wall — right of goal
    ctx.lineTo(w - p - r, p);
    // Top-right corner
    ctx.arcTo(w - p, p, w - p, p + r, r);
    // Right wall
    ctx.lineTo(w - p, h - p - r);
    // Bottom-right corner
    ctx.arcTo(w - p, h - p, w - p - r, h - p, r);
    // Bottom wall — right of goal
    ctx.lineTo(goalRight, h - p);
    // Goal opening (bottom) — no line drawn
    ctx.moveTo(goalLeft, h - p);
    // Bottom wall — left of goal
    ctx.lineTo(p + r, h - p);
    // Bottom-left corner
    ctx.arcTo(p, h - p, p, h - p - r, r);
    // Left wall
    ctx.lineTo(p, p + r);
    // Top-left corner
    ctx.arcTo(p, p, p + r, p, r);
    ctx.stroke();

    // Center line
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = '#12303d';
    ctx.beginPath();
    ctx.moveTo(p, h / 2);
    ctx.lineTo(w - p, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center circle
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 50, 0, Math.PI * 2);
    ctx.strokeStyle = '#12303d';
    ctx.stroke();

    // Goal zones (subtle rectangles behind the goal openings)
    ctx.fillStyle = 'rgba(255, 50, 50, 0.08)';
    ctx.fillRect(goalLeft, 0, goalW, p);           // top goal zone
    ctx.fillRect(goalLeft, h - p, goalW, p);       // bottom goal zone

    // Goal posts (small dots at goal edges)
    ctx.fillStyle = '#ff4444';
    const postSize = 4;
    ctx.fillRect(goalLeft - postSize / 2, p - postSize / 2, postSize, postSize);
    ctx.fillRect(goalRight - postSize / 2, p - postSize / 2, postSize, postSize);
    ctx.fillRect(goalLeft - postSize / 2, h - p - postSize / 2, postSize, postSize);
    ctx.fillRect(goalRight - postSize / 2, h - p - postSize / 2, postSize, postSize);
  }

  function drawPaddle(paddle, playerNum) {
    const halfW = CONSTANTS.PADDLE_WIDTH / 2;
    const halfH = CONSTANTS.PADDLE_HEIGHT / 2;

    // Player 1 = cyan, Player 2 = coral
    const color = playerNum === 1 ? '#00e5ff' : '#ff6b6b';
    const glow = playerNum === 1 ? 'rgba(0, 229, 255, 0.3)' : 'rgba(255, 107, 107, 0.3)';

    // Glow
    ctx.shadowColor = glow;
    ctx.shadowBlur = 10;

    ctx.fillStyle = color;
    ctx.fillRect(
      Math.round(paddle.x - halfW),
      Math.round(paddle.y - halfH),
      CONSTANTS.PADDLE_WIDTH,
      CONSTANTS.PADDLE_HEIGHT
    );

    ctx.shadowBlur = 0;
  }

  function drawPuck(puck) {
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 8;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(Math.round(puck.x), Math.round(puck.y), CONSTANTS.PUCK_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  function drawCountdown(seconds) {
    ctx.fillStyle = '#ffd93d';
    ctx.font = '48px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      seconds > 0 ? String(seconds) : 'GO!',
      CONSTANTS.CANVAS_WIDTH / 2,
      CONSTANTS.CANVAS_HEIGHT / 2
    );
  }

  function drawMessage(text, subtext) {
    ctx.fillStyle = '#00e5ff';
    ctx.font = '20px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT / 2 - 20);

    if (subtext) {
      ctx.fillStyle = '#666';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText(subtext, CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT / 2 + 20);
    }
  }

  function render(state) {
    clear();
    drawRink();
    drawPaddle(state.paddles[1], 1);
    drawPaddle(state.paddles[2], 2);
    drawPuck(state.puck);
  }

  return { init, clear, drawRink, drawPaddle, drawPuck, drawCountdown, drawMessage, render };
})();
