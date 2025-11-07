// server/rooms.js
const rooms = new Map(); // roomId -> Set(socketId)

function joinRoom(roomId, socketId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  rooms.get(roomId).add(socketId);
}

function leaveRoom(roomId, socketId) {
  if (!rooms.has(roomId)) return;
  rooms.get(roomId).delete(socketId);
  if (rooms.get(roomId).size === 0) rooms.delete(roomId);
}

function getMembers(roomId) {
  if (!rooms.has(roomId)) return [];
  return Array.from(rooms.get(roomId));
}

module.exports = { joinRoom, leaveRoom, getMembers };
