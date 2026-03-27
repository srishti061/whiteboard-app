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
const io     = require("socket.io")(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.get("/", (_, res) => res.send("server"));

// In-memory store of latest canvas per room (avoids DB read on every join)
const roomCanvases = {};

io.on("connection", (socket) => {

  // ── Join room ──────────────────────────────────────────────────────────────
  socket.on("user-joined", async (data) => {
    const { roomId, userName, host, presenter, token } = data;

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      socket.emit("error", "Unauthorized");
      return;
    }

    socket.userRoom  = roomId;
    socket.presenter = presenter;

    const user      = userJoin(socket.id, userName, roomId, host, presenter);
    const roomUsers = getUsers(roomId);
    socket.join(roomId);

    // Send existing canvas to the new joiner:
    // 1. Check in-memory first (fastest)
    // 2. Fall back to DB
    if (roomCanvases[roomId]) {
      socket.emit("canvasImage", roomCanvases[roomId]);
    } else {
      const board = await Board.findOne({ roomId });
      if (board && board.imageUrl) {
        roomCanvases[roomId] = board.imageUrl;
        socket.emit("canvasImage", board.imageUrl);
      }
    }

    socket.emit("message", { message: "Welcome to ChatRoom" });
    socket.broadcast.to(roomId).emit("message", {
      message: `${user.username} has joined`,
    });
    io.to(roomId).emit("users", roomUsers);
  });

  // ── Drawing (presenter sends full canvas image on every stroke update) ──────
  // We throttle DB writes — only save on stroke end (save-snapshot event)
  // But broadcast immediately so viewers see updates in near-realtime
  socket.on("drawing", (data) => {
    const roomId = socket.userRoom;
    if (!roomId) return;

    // Cache in memory for instant delivery to new joiners
    roomCanvases[roomId] = data;

    // Broadcast to everyone else in the room immediately
    socket.broadcast.to(roomId).emit("canvasImage", data);
  });

  // ── Save to DB only on mouseUp (not every mousemove) ─────────────────────
  socket.on("save-snapshot", async (data) => {
    const roomId = socket.userRoom;
    if (!roomId) return;
    roomCanvases[roomId] = data;
    await Board.findOneAndUpdate(
      { roomId },
      { imageUrl: data },
      { upsert: true }
    );
  });

  // ── Clear canvas ───────────────────────────────────────────────────────────
  socket.on("clear", async () => {
    const roomId = socket.userRoom;
    if (!roomId) return;
    roomCanvases[roomId] = "";
    await Board.findOneAndUpdate({ roomId }, { imageUrl: "" });
    io.to(roomId).emit("clear");
  });

  // ── Cursor movement ────────────────────────────────────────────────────────
  socket.on("cursor-move", (data) => {
    const roomId = socket.userRoom;
    if (!roomId) return;
    socket.broadcast.to(roomId).emit("cursor-move", {
      socketId: socket.id,
      x:        data.x,
      y:        data.y,
      username: data.username,
    });
  });

  socket.on("cursor-leave", () => {
    const roomId = socket.userRoom;
    if (!roomId) return;
    socket.broadcast.to(roomId).emit("cursor-leave", { socketId: socket.id });
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    const roomId   = socket.userRoom;
    const leftUser = userLeave(socket.id);

    if (leftUser) {
      io.to(leftUser.room).emit("message", {
        message: `${leftUser.username} left the chat`,
      });
      io.to(leftUser.room).emit("users", getUsers(roomId));
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
    server.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => console.error(err));