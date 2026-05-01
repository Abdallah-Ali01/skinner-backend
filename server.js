require("dotenv").config();

const http = require("http");
const app = require("./src/app");
const { Server } = require("socket.io");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
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

  // ── Keep-alive: prevent Render free-tier from sleeping ──
  // Pings /health every 14 minutes (Render sleeps after 15 min idle)
  if (process.env.BASE_URL) {
    const KEEP_ALIVE_MS = 14 * 60 * 1000; // 14 minutes
    setInterval(async () => {
      try {
        const https = require("https");
        const http = require("http");
        const url = `${process.env.BASE_URL}/health`;
        const lib = url.startsWith("https") ? https : http;
        lib.get(url, (res) => {
          console.log(`[keep-alive] pinged ${url} → ${res.statusCode}`);
        });
      } catch (err) {
        console.error("[keep-alive] ping failed:", err.message);
      }
    }, KEEP_ALIVE_MS);
    console.log("[keep-alive] self-ping enabled every 14 minutes");
  }
});