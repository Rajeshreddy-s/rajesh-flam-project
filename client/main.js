// client/main.js
import { connectWS } from "./websocket.js";
import { CanvasManager } from "./canvas.js";

/* ----------------- DOM ELEMENTS ----------------- */
const canvasEl = document.getElementById("draw-canvas");
const colorInput = document.getElementById("color");
const widthInput = document.getElementById("width");
const eraserBtn = document.getElementById("eraser");
const brushBtn = document.getElementById("brush");
const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");
const clearBtn = document.getElementById("clear-canvas");
const userListEl = document.getElementById("user-list");
const roomInput = document.getElementById("room-id");
const joinBtn = document.getElementById("join-room");
const usernameInput = document.getElementById("username");

let socket = null;
let canvasManager = null;
let cursors = new Map();
let activeTool = "brush";

/* ----------------- CURSOR RENDERING ----------------- */
function drawCursors() {
  let overlay = document.getElementById("cursor-overlay");
  if (!overlay) {
    overlay = document.createElement("canvas");
    overlay.id = "cursor-overlay";
    overlay.style.position = "absolute";
    overlay.style.left = canvasEl.offsetLeft + "px";
    overlay.style.top = canvasEl.offsetTop + "px";
    overlay.style.pointerEvents = "none";
    canvasEl.parentElement.appendChild(overlay);
  }

  const ctx = overlay.getContext("2d");
  overlay.width = canvasEl.width;
  overlay.height = canvasEl.height;
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  for (const [id, info] of cursors) {
    ctx.fillStyle = info.color || "rgba(0,0,0,0.8)";
    ctx.beginPath();
    ctx.arc(info.x, info.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "12px sans-serif";
    ctx.fillStyle = info.color || "#000";
    ctx.fillText(info.name || id.substring(0, 6), info.x + 8, info.y + 4);
  }
}

/* ----------------- TOOLBAR HIGHLIGHT ----------------- */
function setActiveTool(tool) {
  activeTool = tool;
  if (tool === "brush") {
    brushBtn.classList.add("active-tool");
    eraserBtn.classList.remove("active-tool");
    canvasEl.style.cursor = "crosshair";
  } else if (tool === "eraser") {
    eraserBtn.classList.add("active-tool");
    brushBtn.classList.remove("active-tool");
    canvasEl.style.cursor = "cell";
  }
}

/* ----------------- CONNECT AND INITIALIZE ----------------- */
function connectAndInit() {
  const roomId = roomInput.value.trim() || "default";
  const userName = usernameInput.value.trim();

  if (!userName) {
    alert("Please enter your name before joining.");
    return;
  }

  socket = connectWS({ roomId, userName });

  socket.on("connect", () => {
    console.log("connected", socket.id);
  });

  // Initialize Canvas Manager
  canvasManager = new CanvasManager(canvasEl, socket, {
    color: colorInput.value,
    width: parseInt(widthInput.value, 10),
    tool: activeTool,
  });

  /* ----------- CURSOR UPDATES FROM OTHERS ----------- */
  socket.on("cursor", ({ id, x, y, color }) => {
    const existing = cursors.get(id) || {};
    const name = existing.name || id.substring(0, 6);
    cursors.set(id, { x, y, color, name });
    drawCursors();
  });

  /* ----------- USERS PANEL UPDATES ----------- */
  socket.on("users", (users) => {
    userListEl.innerHTML = "";
    if (!users || users.length === 0) {
      userListEl.innerHTML = "<li>No users online</li>";
      return;
    }

    users.forEach((u) => {
      const li = document.createElement("li");
      const colorDot = document.createElement("span");
      colorDot.className = "user-color-dot";
      colorDot.style.backgroundColor = u.color;

      const text = document.createElement("span");
      text.textContent = `${u.name} (${u.id.substring(0, 5)})`;

      li.appendChild(colorDot);
      li.appendChild(text);
      userListEl.appendChild(li);

      // Sync cursor info
      if (socket && u.id === socket.id) return;
      const cursor = cursors.get(u.id) || {};
      cursor.name = u.name;
      cursor.color = u.color;
      cursors.set(u.id, cursor);
    });
    drawCursors();
  });

  /* ----------- CLEAR CANVAS REQUEST ----------- */
  clearBtn.addEventListener("click", () => {
    if (confirm("Clear the entire canvas for everyone?")) {
      socket.emit("clear_room");
    }
  });
}

/* ----------------- UI CONTROLS ----------------- */
colorInput.addEventListener("change", (e) => {
  if (canvasManager) canvasManager.setColor(e.target.value);
});
widthInput.addEventListener("input", (e) => {
  if (canvasManager) canvasManager.setWidth(parseInt(e.target.value, 10));
});
eraserBtn.addEventListener("click", () => {
  if (canvasManager) canvasManager.setTool("eraser");
  setActiveTool("eraser");
});
brushBtn.addEventListener("click", () => {
  if (canvasManager) canvasManager.setTool("brush");
  setActiveTool("brush");
});
undoBtn.addEventListener("click", () => {
  if (socket) socket.emit("undo");
});
redoBtn.addEventListener("click", () => {
  if (socket) socket.emit("redo");
});
joinBtn.addEventListener("click", () => {
  if (socket) socket.disconnect();
  connectAndInit();
});

/* ----------------- INITIAL UI STATE ----------------- */
setActiveTool("brush");
