require('dotenv').config();
const mongoose = require('mongoose');
const express  = require("express");
const http     = require("http");
const cors     = require("cors");
const jwt      = require("jsonwebtoken");

const { userJoin, getUsers, userLeave } = require("./utils/user");
const authRoutes = require("./routes/auth");
const Board      = require("./models/Board");

const app    = express();
const server = http.createServer(app);
const FRONTEND_URL = "https://whiteboard-app-snowy.vercel.app";
const PORT = process.env.PORT || 5000;

const io = require("socket.io")(server, {
  cors: { origin: FRONTEND_URL, methods: ["GET", "POST"] },
});

app.use(cors({
  origin: FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));
app.use(express.json());
app.use("/api/auth", authRoutes);
app.get("/", (_, res) => res.send("server"));

const roomCanvases = {};
const activeRooms  = new Set();

io.on("connection", (socket) => {

  socket.on("user-joined", async (data) => {
    const { roomId, userName, name, host, presenter, token } = data;
    const resolvedName = userName || name || "Guest";

    // ── Auth check ─────────────────────────────────────────────────────────
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      socket.emit("error", "Unauthorized");
      return;
    }

    if (presenter) {
      // ── Presenter joining / refreshing ──────────────────────────────────
      // Always upsert the board so the room is valid
      await Board.findOneAndUpdate(
        { roomId },
        { $setOnInsert: { roomId, imageUrl: "" } },
        { upsert: true, new: true }
      );
      activeRooms.add(roomId); // ✅ re-add on refresh

      // Restore canvas from DB if not in memory
      if (!roomCanvases[roomId]) {
        const board = await Board.findOne({ roomId });
        if (board?.imageUrl) roomCanvases[roomId] = board.imageUrl;
      }
    } else {
      // ── Client joining ──────────────────────────────────────────────────
      // Check memory first, then fall back to DB (handles presenter refresh race)
      if (!activeRooms.has(roomId)) {
        const board = await Board.findOne({ roomId });
        if (board) {
          // Room exists in DB — allow client in and restore it
          activeRooms.add(roomId);
          if (board.imageUrl) roomCanvases[roomId] = board.imageUrl;
        } else {
          socket.emit("error", "Room does not exist or has ended");
          return;
        }
      }
    }

    socket.userRoom  = roomId;
    socket.presenter = presenter;

    const user      = userJoin(socket.id, resolvedName, roomId, host, presenter);
    const roomUsers = getUsers(roomId);
    socket.join(roomId);

    // Send current canvas state to the joining socket
    if (roomCanvases[roomId]) {
      socket.emit("canvasImage", roomCanvases[roomId]);
    }

    socket.emit("message", { message: "Welcome to the room!" });
    socket.broadcast.to(roomId).emit("message", { message: `${resolvedName} has joined` });
    io.to(roomId).emit("users", roomUsers);
  });

  socket.on("drawing", (data) => {
    const roomId = socket.userRoom;
    if (!roomId) return;
    roomCanvases[roomId] = data;
    socket.broadcast.to(roomId).emit("canvasImage", data);
  });

  socket.on("save-snapshot", async (data) => {
    const roomId = socket.userRoom;
    if (!roomId) return;
    roomCanvases[roomId] = data;
    await Board.findOneAndUpdate({ roomId }, { imageUrl: data }, { upsert: true });
  });

  socket.on("clear", async () => {
    const roomId = socket.userRoom;
    if (!roomId) return;
    roomCanvases[roomId] = "";
    await Board.findOneAndUpdate({ roomId }, { imageUrl: "" });
    socket.broadcast.to(roomId).emit("clear");
  });

  socket.on("cursor-move", (data) => {
    const roomId = socket.userRoom;
    if (!roomId) return;
    socket.broadcast.to(roomId).emit("cursor-move", {
      socketId: socket.id, x: data.x, y: data.y, username: data.username,
    });
  });

  socket.on("cursor-leave", () => {
    const roomId = socket.userRoom;
    if (!roomId) return;
    socket.broadcast.to(roomId).emit("cursor-leave", { socketId: socket.id });
  });

  socket.on("get-users", () => {
    const roomId = socket.userRoom;
    if (!roomId) return;
    socket.emit("users", getUsers(roomId));
  });

  socket.on("disconnect", () => {
    const roomId   = socket.userRoom;
    const leftUser = userLeave(socket.id);

    if (leftUser) {
      io.to(leftUser.room).emit("message", { message: `${leftUser.username} left the room` });
      io.to(leftUser.room).emit("users", getUsers(leftUser.room));
    }

    // ✅ Only kill the room if no users remain AND it was the presenter
    // Don't delete roomCanvases so canvas survives a presenter refresh
    if (roomId && socket.presenter) {
      const remaining = getUsers(roomId);
      if (remaining.length === 0) {
        activeRooms.delete(roomId);
        // ✅ Do NOT delete roomCanvases[roomId] here — let DB be source of truth
      } else {
        // Other users still in room — notify them presenter left but keep room alive
        io.to(roomId).emit("message", { message: "Host refreshed, reconnecting..." });
      }
    }

    if (roomId) {
      socket.broadcast.to(roomId).emit("cursor-leave", { socketId: socket.id });
    }
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => console.error(err));