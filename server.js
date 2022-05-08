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

  socket.on("disconnect", () => {
    serverLog("a page disconnected from the server: " + socket.id);
  });

  // join_room command handler
  // expected payload { room: room to be joined, username: username }
  // expected response on success { result: success, room: room, username: username, count: # of users in chat }
  // expected response on failure { result: fail, message: reason for failure }
  socket.on("join_room", (payload) => {
    serverLog("server received a command \n'join room'\n " + JSON.stringify(payload));
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

    if (room == null || username == null) {
      response = {};
      response.result = "fail";
      response.message = "client did not send a valid room to join";
      socket.emit("join_room_response", response);
      serverLog("join_room command failed", JSON.stringify(response));
      return;
    }

    if (username == null) {
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
        serverLog("There are " + sockets.length + " clients in the room");
        if (typeof sockets == "undefined" || sockets === null || !sockets.includes(socket)) {
          response = {};
          response.result = "fail";
          response.message = "Server internal error joining chat room";
          socket.emit("join_room_response", response);
          serverLog("join_room command failed", JSON.stringify(response));
        } else {
          response = {};
          response.result = "success";
          response.room = room;
          response.username = username;
          response.count = sockets.length;

          // Tell everyone that a new user has joined the chatroom
          io.of("/").to(room).emit("join_room_response", response);
          socket.emit("join_room_succeeded", response);
          serverLog("join_room command succeeded", JSON.stringify(response));
        }
      });
  });
});
