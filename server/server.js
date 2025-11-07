// server/server.js
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const rooms = require('./rooms');
const drawingState = require('./drawing-state');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 30000,
});

// Serve static client
app.use(express.static(path.join(__dirname, '..', 'client')));

io.on('connection', (socket) => {
  console.log(`socket connected: ${socket.id}`);

  // ---- User joins room ----
  socket.on('join', ({ roomId, userName }) => {
    if (!roomId) roomId = 'default';
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userName = userName || 'Anonymous';
    socket.data.userColor = `hsl(${Math.floor(Math.random() * 360)}, 80%, 50%)`;

    rooms.joinRoom(roomId, socket.id);

    // Send existing drawing history to this user
    const history = drawingState.getHistory(roomId);
    socket.emit('history', history);

    // Broadcast updated user list
    const users = Array.from(io.sockets.sockets.values())
      .filter((s) => s.data.roomId === roomId)
      .map((s) => ({
        id: s.id,
        name: s.data.userName,
        color: s.data.userColor,
      }));

    io.to(roomId).emit('users', users);
    console.log(`${socket.id} joined room ${roomId} as ${socket.data.userName}`);
  });

  // ---- Cursor movement ----
  socket.on('cursor', ({ x, y, color }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('cursor', {
      id: socket.id,
      x,
      y,
      color: color || socket.data.userColor,
    });
  });

  // ---- Stroke chunk (live preview) ----
  socket.on('stroke_chunk', (chunk) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('stroke_chunk', { id: socket.id, chunk });
  });

  // ---- Stroke committed ----
  socket.on('stroke', (op) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    op.userId = socket.id;
    op.userName = socket.data.userName;
    op.color = op.type === 'erase' ? 'erase' : op.color || '#000000';

    const saved = drawingState.addOperation(roomId, op);
    io.to(roomId).emit('stroke_committed', saved);
  });

  // ---- Undo / Redo ----
  socket.on('undo', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    drawingState.undo(roomId);
    io.to(roomId).emit('history', drawingState.getHistory(roomId));
  });

  socket.on('redo', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    drawingState.redo(roomId);
    io.to(roomId).emit('history', drawingState.getHistory(roomId));
  });

  // ---- Request full history ----
  socket.on('request_history', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.emit('history', drawingState.getHistory(roomId));
  });

  // ---- Clear room ----
  socket.on('clear_room', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    drawingState.clear(roomId);
    io.to(roomId).emit('history', []);
  });

  // ---- Disconnect ----
  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    rooms.leaveRoom(roomId, socket.id);

    const users = Array.from(io.sockets.sockets.values())
      .filter((s) => s.data.roomId === roomId)
      .map((s) => ({
        id: s.id,
        name: s.data.userName,
        color: s.data.userColor,
      }));

    io.to(roomId).emit('users', users);
    console.log(`socket disconnected: ${socket.id}`);
  });
});

// ---- Start Server ----
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
