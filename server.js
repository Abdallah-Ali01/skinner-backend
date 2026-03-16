const http = require("http");
const app = require("./src/app");
const { Server } = require("socket.io");
require("dotenv").config();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

require("./src/socket/chatSocket")(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`SKINNER backend running on port ${PORT}`);
});

const { verifyEmailConnection } = require("./src/services/emailService");

verifyEmailConnection()
  .then(() => console.log("SMTP connection is ready"))
  .catch((err) => console.error("SMTP connection failed:", err.message));



  