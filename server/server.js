import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
});

app.get("/", (req, res) => {
  res.send("Whiteboard server running");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("draw", (data) => {
    socket.broadcast.emit("draw", data);
  });

  socket.on("clear", () => {
    socket.broadcast.emit("clear");
  });
});

httpServer.listen(3000, () => {
  console.log("Server started on port 3000");
});
