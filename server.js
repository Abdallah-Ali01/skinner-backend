require("dotenv").config();

const http = require("http");
const app = require("./src/app");
const { Server } = require("socket.io");

const server = http.createServer(app);

const socketAllowedOrigins = [
  process.env.FRONTEND_URL,
  "https://skinnerai.site",
  "https://www.skinnerai.site",
  "http://localhost:5173"
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: socketAllowedOrigins,
    methods: ["GET", "POST"]
  }
});

require("./src/socket/chatSocket")(io);

const PORT = process.env.PORT || 5000;

const { verifyEmailConnection } = require("./src/services/emailService");

// Verify SMTP before accepting requests
verifyEmailConnection()
  .then(() => console.log("SMTP connection is ready"))
  .catch((err) => console.error("SMTP connection failed:", err.message));

server.listen(PORT, () => {
  console.log(`SKINNER backend running on port ${PORT}`);
});