# Collaborative Canvas

## Setup
npm install
npm start
Open http://localhost:3000 in multiple browsers/tabs.
First Join the Room by giving User Name and Then start Drawing.
## Features
- Brush, color, width, eraser (eraser = drawing with white color)
- Real-time sync with Socket.io
- Live preview via strokeChunk
- Global undo/redo (logical delete via tombstones)
- User cursor positions

## Limitations
- Server memory stores history; no persistence.
- Undo currently reverts last global stroke (change to per-user undo if desired).
- Redo revives most recent tombstoned stroke (simplified).


