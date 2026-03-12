// Hockey Pong — Game Controller
// Manages screens, game modes, and the main game loop.
// Quorra: flesh out the game loop, screen transitions, and multiplayer integration.

const Game = (() => {
  // --- DOM refs ---
  const screens = {
    menu: document.getElementById('menu'),
    lobby: document.getElementById('lobby'),
    game: document.getElementById('game-screen'),
    over: document.getElementById('game-over'),
  };

  const els = {
    canvas: document.getElementById('game-canvas'),
    scoreDisplay: document.getElementById('score-display'),
    roomCode: document.getElementById('room-code'),
    winnerText: document.getElementById('winner-text'),
    finalScore: document.getElementById('final-score'),
    roomInput: document.getElementById('input-room'),
    menuStatus: document.getElementById('menu-status'),
    btnCreate: document.getElementById('btn-create'),
    btnJoin: document.getElementById('btn-join'),
  };

  let mode = null; // 'single' | 'multi'
  let state = null;
  let playerNumber = 2; // in single player, human is player 2 (bottom)
  let animFrameId = null;
  let lastTick = 0;
  let countdownValue = 0;
  let countdownTimer = null;

  // --- Screen management ---
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[name].classList.remove('hidden');
  }

  // --- Game loop ---
  function gameLoop(timestamp) {
    animFrameId = requestAnimationFrame(gameLoop);

    Input.update();

    if (state.phase === 'playing') {
      if (mode === 'single') {
        // AI controls player 1
        const aiDir = AI.update(state);
        const humanDir = Input.getDirection();
        const result = Physics.update(state, { 1: aiDir, 2: humanDir });

        if (result) {
          if (result.event === 'score') {
            handleScore(result.scorer);
          } else if (result.event === 'game_over') {
            handleGameOver(result.winner);
            return;
          }
        }
      } else {
        // Multiplayer — send input, server handles state
        const dir = Input.getDirection();
        Network.send(MSG.PLAYER_INPUT, { direction: dir });
      }
    }

    // Render
    Renderer.render(state);

    if (state.phase === 'countdown') {
      Renderer.drawCountdown(countdownValue);
    } else if (state.phase === 'waiting') {
      Renderer.drawMessage('READY', 'Press any key or wait...');
    }

    // Update HUD
    els.scoreDisplay.textContent = `${state.scores[1]} — ${state.scores[2]}`;
  }

  function startGameLoop() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(gameLoop);
  }

  function stopGameLoop() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  // --- Countdown ---
  function startCountdown(onFinish) {
    countdownValue = CONSTANTS.COUNTDOWN_SECONDS;
    state.phase = 'countdown';

    countdownTimer = setInterval(() => {
      countdownValue--;
      if (countdownValue < 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        if (onFinish) onFinish();
      }
    }, 1000);
  }

  // --- Score handling ---
  function handleScore(scorer) {
    Physics.resetPuck(state);
    // Brief pause then relaunch
    setTimeout(() => {
      if (state.phase !== 'over') {
        startCountdown(() => {
          state.phase = 'playing';
          Physics.launchPuck(state);
        });
      }
    }, 500);
  }

  // --- Game over ---
  function handleGameOver(winner) {
    stopGameLoop();
    state.phase = 'over';

    const isWinner = (mode === 'single' && winner === 2) ||
                     (mode === 'multi' && winner === playerNumber);
    els.winnerText.textContent = isWinner ? 'YOU WIN!' : 'YOU LOSE!';
    els.finalScore.textContent = `${state.scores[1]} — ${state.scores[2]}`;
    showScreen('over');
  }

  // --- Start single player ---
  function startSinglePlayer() {
    mode = 'single';
    playerNumber = 2;
    state = Physics.createGameState();
    AI.reset();
    showScreen('game');
    startGameLoop();

    startCountdown(() => {
      state.phase = 'playing';
      Physics.launchPuck(state);
    });
  }

  // --- Multiplayer UI helpers ---
  function showMenuStatus(text, isError) {
    els.menuStatus.textContent = text;
    els.menuStatus.classList.toggle('error', !!isError);
    els.menuStatus.classList.remove('hidden');
  }

  function hideMenuStatus() {
    els.menuStatus.classList.add('hidden');
    els.menuStatus.classList.remove('error');
    els.menuStatus.textContent = '';
  }

  function setMultiplayerButtonsEnabled(enabled) {
    els.btnCreate.disabled = !enabled;
    els.btnJoin.disabled = !enabled;
  }

  function handleConnectionError(message) {
    setMultiplayerButtonsEnabled(true);
    showMenuStatus(message, true);
    // Auto-clear error after 4 seconds
    setTimeout(() => {
      if (els.menuStatus.classList.contains('error')) {
        hideMenuStatus();
      }
    }, 4000);
  }

  // --- Multiplayer handlers ---
  function startMultiplayerCreate() {
    mode = 'multi';
    setMultiplayerButtonsEnabled(false);
    showMenuStatus('CONNECTING...');
    Network.connect(handleServerMessage, () => {
      hideMenuStatus();
      setMultiplayerButtonsEnabled(true);
      Network.send(MSG.CREATE_ROOM);
    }, handleDisconnect, (errMsg) => {
      handleConnectionError(errMsg);
    });
  }

  function startMultiplayerJoin(roomId) {
    mode = 'multi';
    setMultiplayerButtonsEnabled(false);
    showMenuStatus('CONNECTING...');
    Network.connect(handleServerMessage, () => {
      hideMenuStatus();
      setMultiplayerButtonsEnabled(true);
      Network.send(MSG.JOIN_ROOM, { roomId: roomId.toUpperCase() });
    }, handleDisconnect, (errMsg) => {
      handleConnectionError(errMsg);
    });
  }

  function handleServerMessage(msg) {
    switch (msg.type) {
      case MSG.ROOM_CREATED:
        els.roomCode.textContent = msg.roomId;
        showScreen('lobby');
        break;

      case MSG.ROOM_JOINED:
        playerNumber = msg.playerNumber;
        break;

      case MSG.OPPONENT_JOINED:
        state = Physics.createGameState();
        showScreen('game');
        startGameLoop();
        // Signal ready so server can start countdown
        Network.send(MSG.PLAYER_READY);
        break;

      case MSG.GAME_COUNTDOWN:
        countdownValue = msg.seconds;
        state.phase = 'countdown';
        break;

      case MSG.GAME_START:
        state.phase = 'playing';
        break;

      case MSG.GAME_STATE:
        // Update state from server (authoritative)
        if (state) {
          state.puck = msg.puck;
          state.paddles = msg.paddles;
          state.scores = msg.scores;
          state.tick = msg.tick;
        }
        break;

      case MSG.SCORE:
        if (state) {
          state.scores = msg.scores;
        }
        break;

      case MSG.GAME_OVER:
        if (state) {
          state.scores = msg.scores;
          handleGameOver(msg.winner);
        }
        break;

      case MSG.OPPONENT_LEFT:
        handleDisconnect();
        break;

      case MSG.ERROR:
        alert(msg.message);
        showScreen('menu');
        break;
    }
  }

  function handleDisconnect() {
    stopGameLoop();
    Network.disconnect();
    setMultiplayerButtonsEnabled(true);
    hideMenuStatus();
    showScreen('menu');
  }

  // --- Init ---
  function init() {
    Renderer.init(els.canvas);
    Input.init();

    // Button handlers
    document.getElementById('btn-single').addEventListener('click', startSinglePlayer);

    document.getElementById('btn-create').addEventListener('click', startMultiplayerCreate);

    document.getElementById('btn-join').addEventListener('click', () => {
      const code = els.roomInput.value.trim();
      if (code.length === CONSTANTS.ROOM_CODE_LENGTH) {
        startMultiplayerJoin(code);
      }
    });

    document.getElementById('btn-copy-link').addEventListener('click', () => {
      const code = els.roomCode.textContent;
      const link = `${window.location.origin}?room=${code}`;
      navigator.clipboard.writeText(link).catch(() => {});
    });

    document.getElementById('btn-back-menu').addEventListener('click', () => {
      Network.disconnect();
      showScreen('menu');
    });

    document.getElementById('btn-play-again').addEventListener('click', () => {
      if (mode === 'single') {
        startSinglePlayer();
      } else {
        showScreen('menu');
      }
    });

    document.getElementById('btn-main-menu').addEventListener('click', () => {
      Network.disconnect();
      showScreen('menu');
    });

    // Check URL for room invite
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      startMultiplayerJoin(roomParam);
    }
  }

  // Boot
  document.addEventListener('DOMContentLoaded', init);

  return { init };
})();
