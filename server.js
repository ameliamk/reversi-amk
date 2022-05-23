// Set up the static file server
let static = require("node-static");

// Set up the http server
let http = require("http");

// Assume running on Heroku
let port = process.env.PORT;
let directory = __dirname + "/public";

// If not on Heroku, adjust port + directory
if (typeof port == "undefined" || port === null) {
  port = 8080;
  directory = "./public";
}

// Set up static file web server to deliver files
let file = new static.Server(directory);

let app = http
  .createServer(function (request, response) {
    request
      .addListener("end", function () {
        file.serve(request, response);
      })
      .resume();
  })
  .listen(port);

// Set up the web socket server
// Set up a registry of player info and socket id

let players = [];

const { Server } = require("socket.io");
const io = new Server(app);

io.on("connection", (socket) => {
  // Output a log message on server and send it to the clients
  function serverLog(...messages) {
    io.emit("log", ["**** Message from the server:\n"]);
    messages.forEach((item) => {
      io.emit("log", ["****\t" + item]);
      console.log(item);
    });
  }

  serverLog("a page connected to the server: " + socket.id);

  // join_room command handler
  socket.on("join_room", (payload) => {
    serverLog("server received a command \n'join_room'\n " + JSON.stringify(payload));
    if (typeof payload == "undefined" || payload === null) {
      response = {};
      response.result = "fail";
      response.message = "client did not send a payload";
      socket.emit("join_room_response", response);
      serverLog("join_room command failed", JSON.stringify(response));
      return;
    }

    let room = payload.room;
    let username = payload.username;

    if (typeof room == "undefined" || room === null) {
      response = {};
      response.result = "fail";
      response.message = "client did not send a valid room to join";
      socket.emit("join_room_response", response);
      serverLog("join_room command failed", JSON.stringify(response));
      return;
    }

    if (typeof username == "undefined" || username === null) {
      response = {};
      response.result = "fail";
      response.message = "client did not send a valid username to join";
      socket.emit("join_room_response", response);
      serverLog("join_room command failed", JSON.stringify(response));
      return;
    }

    // Handle the command
    socket.join(room);

    // Make sure client was put in the room
    io.in(room)
      .fetchSockets()
      .then((sockets) => {
        if (typeof sockets == "undefined" || sockets === null || !sockets.includes(socket)) {
          response = {};
          response.result = "fail";
          response.message = "Server internal error joining chat room";
          socket.emit("join_room_response", response);
          serverLog("join_room command failed", JSON.stringify(response));
        } else {
          players[socket.id] = { username: username, room: room };

          // Announce to everyone in the room who's in the room
          for (const member of sockets) {
            response = {
              result: "success",
              socket_id: member.id,
              room: players[member.id].room,
              username: players[member.id].username,
              count: sockets.length,
            };
          }
          // Tell everyone that a new user has joined the chatroom
          io.of("/").to(room).emit("join_room_response", response);
          socket.emit("join_room_succeeded", response);
          serverLog("join_room command succeeded", JSON.stringify(response));
        }
      });
  });

  socket.on("disconnect", () => {
    serverLog("a page disconnected from the server: " + socket.id);
    if (typeof players[socket.id] != "undefined" && players[socket.id] != null) {
      let payload = {
        username: players[socket.id].username,
        room: players[socket.id].room,
        count: Object.keys(players).length - 1,
        socket_id: socket.id,
      };
      let room = players[socket.id].room;
      delete players[socket.id];

      io.of("/").to(room).emit("player_disconnected", payload);
      serverLog("Player disconnected succeeded" + JSON.stringify(payload));
    }
  });

  // send_chat_message command handler
  socket.on("send_chat_message", (payload) => {
    serverLog("server received a command \n'send_chat_message'\n " + JSON.stringify(payload));
    if (typeof payload == "undefined" || payload === null) {
      response = {};
      response.result = "fail";
      response.message = "client did not send a payload";
      socket.emit("send_chat_message_response", response);
      serverLog("send_chat_message command failed", JSON.stringify(response));
      return;
    }

    let room = payload.room;
    let username = payload.username;
    let message = payload.message;

    if (typeof room == "undefined" || room === null) {
      response = {};
      response.result = "fail";
      response.message = "client did not send a valid room to message";
      socket.emit("send_chat_message_response", response);
      serverLog("send_chat_message command failed", JSON.stringify(response));
      return;
    }

    if (typeof username == "undefined" || username === null) {
      response = {};
      response.result = "fail";
      response.message = "client did not send a valid username to message";
      socket.emit("send_chat_message_response", response);
      serverLog("send_chat_message command failed", JSON.stringify(response));
      return;
    }

    if (typeof message == "undefined" || message === null) {
      response = {};
      response.result = "fail";
      response.message = "client did not send a valid message";
      socket.emit("send_chat_message_response", response);
      serverLog("send_chat_message command failed", JSON.stringify(response));
      return;
    }

    // Handle the command
    let response = {};
    response.result = "success";
    response.username = username;
    response.room = room;
    response.message = message;

    // Tell everyone in the room what the message is

    io.of("/").to(room).emit("send_chat_message_response", response);
    serverLog("send_chat_message command succeeeded", JSON.stringify(response));
  });
});
