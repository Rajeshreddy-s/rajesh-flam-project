# ARCHITECTURE

## Data flow
User input -> client preview -> send strokeChunk -> server broadcasts chunk -> other clients render preview
When finishing stroke: client -> commitStroke -> server appends stroke to history -> server broadcasts commit -> clients add to canonical history and redraw

## WebSocket messages
- joinRoom: { roomId, username }
- initHistory: [strokes...]
- strokeChunk: { strokeId, userId, points[], color, width, isFinal }
- commitStroke: { strokeId, userId, points[], color, width, timestamp }
- undo: { roomId, userId, targetStrokeId? }
- redo: { roomId, userId }

## Undo/Redo strategy
Operation log with tombstones. Undo = add strokeId to tombstones -> clients skip on redraw. Redo = remove tombstone. Pros: deterministic, easy to re-render. Cons: rewinding is per-op (not per-user) unless server filters by user.

## Conflict resolution
Strokes are commutative by timestamp ordering. Overlapping strokes render by order. Use server timestamp as canonical order.

## Performance choices
- chunking + client prediction
- layered canvas (preview/drawing/background)
- smoothing via quadratic curves
