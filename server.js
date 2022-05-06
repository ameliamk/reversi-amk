// Set up the static file server
let static = require("node-static");

// Set up the http server
let http = require("http");

// Assume running on Heroku
let port = process.env.PORT;
let directory = __dirname + "/public";

// If not on Heroku, adjust port + directory
if (typeof port == undefined || port === undefined) {
  port = 8080;
  directory = "./public";
}

console.log("port", port);
console.log(process.env.PORT);
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
