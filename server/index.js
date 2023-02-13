const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const ACTIONS = require("./Actions");
const server = http.createServer(app);

const io = new Server(server);
const PORT = process.env.PORT || 5000;
const userSocketMap = {};
function getAllConnectedClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    socketId => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  ); //from all the rooms that present in adapter in the whose roomId is the this we are getting it from it
  //and it s type is map
  //and to convert it in the array we are doing to it array from
}
io.on("connection", socket => {
  console.log("socket connected", socket.id);
  // socket.on()
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    console.log(clients);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      }); //io.to is used to send the message to the particular socketId
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code, origin, lan }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code, origin, lan });
  });
  // socket.on(ACTIONS.SYNC_CODE, ({ socketId, code, lan }) => {
  //   (socketId).emit(ACTIONS.CODE_CHANGE, { code, lan });
  // });

  //before socket disconnect completely we will get this lifecycle hook or we can say that event
  //and this event is sended to the server and the server will send it to all the clients
  //this event is send by the client to server that client is disconnecting
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms]; //socket.rooms is map so we have to convert it in the array
    rooms.forEach(roomId => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });
});

server.listen(PORT, () => {
  console.log("Listening on port `" + PORT + "`");
});
