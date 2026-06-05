const { io } = require("socket.io-client");

//  هنا التوكن بتاع patient أو doctor
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjM0N2YzOGMxLTY4ZTUtNDdkYS1hZTkxLTJlMTk5MGRiNzRhOCIsImVtYWlsIjoicGF0aWVudDFAdGVzdC5jb20iLCJyb2xlIjoicGF0aWVudCIsImlhdCI6MTc3MzE2MDkwNiwiZXhwIjoxNzczNzY1NzA2fQ.nMwc9AOE6DN70hPpCzEV3zcpxqp2g5poEB0irW-vXUQ";

//  هنا chat_id صالح ومدفوع
const CHAT_ID = "5b781ee4-1c8e-4ed7-8a31-c40ca4f98357";

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