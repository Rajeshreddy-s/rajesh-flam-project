// client/canvas.js
class CanvasManager {
  constructor(canvas, socket, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.socket = socket;
    this.dpr = window.devicePixelRatio || 1;

    this.color = options.color || '#000000';
    this.width = options.width || 4;
    this.tool = options.tool || 'brush';

    this.isDrawing = false;
    this.currentPoints = [];
    this.remotePreviewPaths = new Map();

    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());
    this._bindPointerEvents();
    this._setupSocketListeners();
  }

  _setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('history', (history) => this.renderFromHistory(history || []));
    this.socket.on('stroke_committed', (op) => this._drawSegment(this.ctx, op, false));
    this.socket.on('stroke_chunk', ({ id, chunk }) => this.handleRemoteChunk({ id, chunk }));
  }

  _resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.round(rect.width * this.dpr);
    const h = Math.round(rect.height * this.dpr);
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, w, h);
    if (this.socket && this.socket.connected) {
      this.socket.emit('request_history');
    }
  }

  setTool(tool) { this.tool = tool; }
  setColor(color) { this.color = color; }
  setWidth(w) { this.width = w; }

  _bindPointerEvents() {
    const canvas = this.canvas;
    canvas.addEventListener('pointerdown', this._onPointerDown.bind(this));
    canvas.addEventListener('pointermove', this._onPointerMove.bind(this));
    window.addEventListener('pointerup', this._onPointerUp.bind(this));
    canvas.addEventListener('pointercancel', this._onPointerUp.bind(this));

    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (this.socket && this.socket.connected) {
        this.socket.emit('cursor', { x, y, color: this.color });
      }
    });
  }

  _onPointerDown(e) {
    if (e.button !== 0) return;
    this.isDrawing = true;
    this.currentPoints = [];
    this._addPoint(e);
  }

  _onPointerMove(e) {
    if (!this.isDrawing) return;
    this._addPoint(e);
    this._drawLocalPreview();
  }

  _onPointerUp() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    const pts = this.currentPoints.slice();
    if (pts.length > 1) {
      const op = {
        type: this.tool === 'eraser' ? 'erase' : 'stroke',
        color: this.color,
        width: this.width,
        points: pts,
      };
      if (this.socket && this.socket.connected) {
        this.socket.emit('stroke', op);
      }
    }
    this.currentPoints = [];
  }

  _addPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.currentPoints.push({ x, y });
  }

  _drawLocalPreview() {
    const pts = this.currentPoints;
    if (pts.length < 2) return;
    this._drawSegment(this.ctx, {
      type: this.tool === 'eraser' ? 'erase' : 'stroke',
      color: this.color,
      width: this.width,
      points: pts.slice(-12),
    });
  }

  _drawSegment(context, op) {
    if (!op || !op.points || op.points.length < 2) return;
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = op.width;

    if (op.type === 'erase') {
      context.globalCompositeOperation = 'destination-out';
      context.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = op.color;
    }

    const pts = op.points;
    context.beginPath();
    context.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      context.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }
    context.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    context.stroke();
    context.restore();
  }

  renderFromHistory(history) {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    for (const op of history) this._drawSegment(this.ctx, op);
  }

  handleRemoteChunk({ id, chunk }) {
    this.remotePreviewPaths.set(id, chunk);
    for (const [id, p] of this.remotePreviewPaths) {
      this._drawSegment(this.ctx, {
        type: p.tool === 'eraser' ? 'erase' : 'stroke',
        color: p.color,
        width: p.width,
        points: p.points,
      });
    }
    this.remotePreviewPaths.clear();
  }
}

export { CanvasManager };
export default CanvasManager;