// server/drawing-state.js
const { v4: uuidv4 } = require('uuid');

class DrawingState {
  constructor() {
    // map roomId -> { history: [], redo: [] }
    this.rooms = new Map();
  }

  _ensure(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, { history: [], redo: [] });
    }
  }

  addOperation(roomId, op) {
    this._ensure(roomId);
    // ensure id and timestamp
    op.id = op.id || uuidv4();
    op.timestamp = Date.now();
    this.rooms.get(roomId).history.push(op);
    // clear redo on new op
    this.rooms.get(roomId).redo = [];
    return op;
  }

  getHistory(roomId) {
    this._ensure(roomId);
    return this.rooms.get(roomId).history.slice(); // copy
  }

  undo(roomId) {
    this._ensure(roomId);
    const room = this.rooms.get(roomId);
    if (room.history.length === 0) return null;
    const op = room.history.pop();
    room.redo.push(op);
    return op;
  }

  redo(roomId) {
    this._ensure(roomId);
    const room = this.rooms.get(roomId);
    if (room.redo.length === 0) return null;
    const op = room.redo.pop();
    room.history.push(op);
    return op;
  }

  clear(roomId) {
    this.rooms.set(roomId, { history: [], redo: [] });
  }
}

module.exports = new DrawingState();
