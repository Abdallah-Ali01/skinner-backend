const { io } = require("socket.io-client");

//  Load token from environment — never hardcode tokens
const TOKEN = process.env.TEST_SOCKET_TOKEN || "";
if (!TOKEN) {
  console.error("TEST_SOCKET_TOKEN is not set in environment. Exiting.");
  process.exit(1);
}

//  هنا chat_id صالح ومدفوع
const CHAT_ID = process.env.TEST_CHAT_ID || "";

const socket = io("http://localhost:5000", {
  auth: {
    token: TOKEN
  },
  transports: ["websocket", "polling"]
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  socket.emit("join_chat", { chat_id: CHAT_ID });
});

socket.on("joined_chat", (data) => {
  console.log("JOINED CHAT:", data);

  socket.emit("send_message", {
    chat_id: CHAT_ID,
    message_text: "Hello from socket test"
  });
});

socket.on("new_message", (payload) => {
  console.log("NEW MESSAGE:", payload);
});

socket.on("chat_error", (err) => {
  console.log("CHAT ERROR:", err);
});

socket.on("connect_error", (err) => {
  console.log("CONNECT ERROR:", err.message);
});