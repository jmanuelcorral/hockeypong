// Hockey Pong — Input Handler
// Captures keyboard input and exposes current direction.

const Input = (() => {
  const keys = {};
  let currentDirection = 'none';

  function init() {
    window.addEventListener('keydown', (e) => {
      keys[e.key] = true;
      // Prevent scrolling with arrow keys
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      keys[e.key] = false;
    });

    // Reset keys on blur to avoid stuck keys
    window.addEventListener('blur', () => {
      for (const key in keys) keys[key] = false;
    });
  }

  function update() {
    const left = keys['ArrowLeft'] || keys['a'] || keys['A'];
    const right = keys['ArrowRight'] || keys['d'] || keys['D'];

    if (left && !right) {
      currentDirection = 'left';
    } else if (right && !left) {
      currentDirection = 'right';
    } else {
      currentDirection = 'none';
    }
  }

  function getDirection() {
    return currentDirection;
  }

  return { init, update, getDirection };
})();
