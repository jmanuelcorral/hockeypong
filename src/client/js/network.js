// Hockey Pong — Network Client
// WebSocket wrapper for multiplayer communication.

const Network = (() => {
  let ws = null;
  let messageHandler = null;
  let connectHandler = null;
  let disconnectHandler = null;

  function connect(onMessage, onConnect, onDisconnect) {
    messageHandler = onMessage;
    connectHandler = onConnect;
    disconnectHandler = onDisconnect;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
      if (connectHandler) connectHandler();
    };

    ws.onmessage = (event) => {
      const msg = parseMsg(event.data);
      if (msg && messageHandler) messageHandler(msg);
    };

    ws.onclose = () => {
      if (disconnectHandler) disconnectHandler();
      ws = null;
    };

    ws.onerror = () => {
      // onclose will fire after this
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
