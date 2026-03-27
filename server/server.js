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
const FRONTEND_URL = "https://whiteboard-app-black-kappa.vercel.app"; // your actual Vercel URL

const io = require("socket.io")(server, {
  cors: { origin: FRONTEND_URL, methods: ["GET", "POST"] },
});
app.use(cors({ origin: FRONTEND_URL }));

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.get("/", (_, res) => res.send("server"));

const roomCanvases = {};

io.on("connection", (socket) => {

  socket.on("user-joined", async (data) => {
    // ✅ Accept both `userName` and `name` as fallback
    const { roomId, userName, name, host, presenter, token } = data;
    const resolvedName = userName || name || "Guest";   // ← fallback chain

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      socket.emit("error", "Unauthorized");
      return;
    }

    socket.userRoom  = roomId;
    socket.presenter = presenter;

    const user      = userJoin(socket.id, resolvedName, roomId, host, presenter);
    const roomUsers = getUsers(roomId);
    socket.join(roomId);

    if (roomCanvases[roomId]) {
      socket.emit("canvasImage", roomCanvases[roomId]);
    } else {
      const board = await Board.findOne({ roomId });
      if (board && board.imageUrl) {
        roomCanvases[roomId] = board.imageUrl;
        socket.emit("canvasImage", board.imageUrl);
      }
    }

    socket.emit("message", { message: "Welcome to the room!" });
    socket.broadcast.to(roomId).emit("message", {
      message: `${resolvedName} has joined`,
    });

    // ✅ Emit updated user list to ALL in room (including new joiner)
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
    await Board.findOneAndUpdate(
      { roomId },
      { imageUrl: data },
      { upsert: true }
    );
  });

  socket.on("clear", async () => {
    const roomId = socket.userRoom;
    if (!roomId) return;
    roomCanvases[roomId] = "";
    await Board.findOneAndUpdate({ roomId }, { imageUrl: "" });
    io.to(roomId).emit("clear");
  });

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

  socket.on("disconnect", () => {
    const roomId   = socket.userRoom;
    const leftUser = userLeave(socket.id);

    if (leftUser) {
      io.to(leftUser.room).emit("message", {
        message: `${leftUser.username} left the room`,
      });
      io.to(leftUser.room).emit("users", getUsers(leftUser.room));
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