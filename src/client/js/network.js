// Hockey Pong — Network Client
// WebSocket wrapper for multiplayer communication.

const Network = (() => {
  let ws = null;
  let messageHandler = null;
  let connectHandler = null;
  let disconnectHandler = null;
  let errorHandler = null;
  let connectTimeout = null;

  const CONNECT_TIMEOUT_MS = 5000;

  function clearConnectTimeout() {
    if (connectTimeout) {
      clearTimeout(connectTimeout);
      connectTimeout = null;
    }
  }

  function connect(onMessage, onConnect, onDisconnect, onError) {
    messageHandler = onMessage;
    connectHandler = onConnect;
    disconnectHandler = onDisconnect;
    errorHandler = onError || null;

    // Prevent stale connections
    if (ws) {
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
      ws = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let didConnect = false;

    try {
      ws = new WebSocket(`${protocol}//${window.location.host}`);
    } catch (e) {
      if (errorHandler) errorHandler('Could not create connection');
      return;
    }

    // Timeout if connection doesn't open in time
    connectTimeout = setTimeout(() => {
      if (!didConnect && ws) {
        ws.onclose = null; // prevent disconnect handler from also firing
        ws.close();
        ws = null;
        if (errorHandler) errorHandler('Connection timed out');
      }
    }, CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      didConnect = true;
      clearConnectTimeout();
      if (connectHandler) connectHandler();
    };

    ws.onmessage = (event) => {
      const msg = parseMsg(event.data);
      if (msg && messageHandler) messageHandler(msg);
    };

    ws.onclose = () => {
      clearConnectTimeout();
      if (!didConnect && errorHandler) {
        // Never connected — this is an error, not a disconnect
        errorHandler('Could not connect to server');
      } else if (didConnect && disconnectHandler) {
        disconnectHandler();
      }
      ws = null;
    };

    ws.onerror = () => {
      // onclose will fire after this and handle the error callback
    };
  }

  function send(type, payload = {}) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(makeMsg(type, payload));
    }
  }

  function disconnect() {
    if (ws) {
      ws.close();
      ws = null;
    }
  }

  function isConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
  }

  return { connect, send, disconnect, isConnected };
})();
