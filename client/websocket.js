// client/websocket.js
// Minimal wrapper around socket.io-client
// Note: socket.io client lib is loaded from CDN inside index.html

let socket = null;

function connectWS({ roomId = 'default', userName = 'Anonymous' } = {}) {
  if (!window.io) {
    throw new Error('socket.io client library not loaded');
  }
  socket = io(); // connect to same host

  socket.on('connect', () => {
    socket.emit('join', { roomId, userName });
  });

  return socket;
}

export { connectWS };
