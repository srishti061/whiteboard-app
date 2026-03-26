require('dotenv').config();
console.log("MONGO_URI:", process.env.MONGO_URI);
const mongoose = require('mongoose');

const express = require("express");
const http = require("http");
const cors = require("cors");
const { userJoin, getUsers, userLeave } = require("./utils/user");
const authRoutes = require("./routes/auth");
const Board = require("./models/Board");

const app = express();
const server = http.createServer(app);
const socketIO = require("socket.io");
const io = socketIO(server); 
const jwt = require("jsonwebtoken");

// serve on port
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("server");
});

// socket.io
let imageUrl, userRoom;
io.on("connection", (socket) => {
  socket.on("user-joined", async (data) => {
  const { roomId, userId, userName, host, presenter, token } = data;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
  } catch (err) {
    socket.emit("error", "Unauthorized");
    return;
  }

  socket.userRoom = roomId;

  const user = userJoin(socket.id, userName, roomId, host, presenter);
  const roomUsers = getUsers(user.room);

  socket.join(user.room);

  const board = await Board.findOne({ roomId });

  if (board) {
    socket.emit("canvasImage", board.imageUrl);
  }

  socket.emit("message", {
    message: "Welcome to ChatRoom",
  });

  socket.broadcast.to(user.room).emit("message", {
    message: `${user.username} has joined`,
  });

  io.to(user.room).emit("users", roomUsers);

  if (!board) {
    io.to(user.room).emit("canvasImage", imageUrl);
  }
});

  socket.on("drawing", async (data) => {
    console.log("DRAWING EVENT RECEIVED"); 
  imageUrl = data;

  // save to DB
  await Board.findOneAndUpdate(
    { roomId: userRoom },
    { imageUrl },
    { upsert: true }
  );

  socket.broadcast.to(userRoom).emit("canvasImage", imageUrl);
});

  socket.on("disconnect", () => {
    const userLeaves = userLeave(socket.id);
    const roomUsers = getUsers(userRoom);

    if (userLeaves) {
      io.to(userLeaves.room).emit("message", {
        message: `${userLeaves.username} left the chat`,
      });
      io.to(userLeaves.room).emit("users", roomUsers);
    }
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");

    server.listen(PORT, () =>
      console.log(`server is listening on http://localhost:${PORT}`)
    );
  })
  .catch(err => console.log(err));
