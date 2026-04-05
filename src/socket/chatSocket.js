const jwt = require("jsonwebtoken");
const chatService = require("../services/chatService");

module.exports = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token provided"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join_chat", async ({ chat_id }) => {
      try {
        const access = await chatService.checkAccess(chat_id, socket.user.id, socket.user.role);
        if (!access.allowed) {
          return socket.emit("chat_error", { message: "Access denied or payment required" });
        }
        socket.join(chat_id);
        socket.emit("joined_chat", { chat_id });
      } catch (error) {
        socket.emit("chat_error", { message: error.message });
      }
    });

    socket.on("send_message", async ({ chat_id, message_text }) => {
      try {
        // التحقق قبل الحفظ
        const access = await chatService.checkAccess(chat_id, socket.user.id, socket.user.role);
        if (!access.allowed) return socket.emit("chat_error", { message: "Unauthorized" });

        const message = await chatService.saveMessage({
          chat_id,
          sender_id: socket.user.id,
          sender_role: socket.user.role,
          message_text
        });

        io.to(chat_id).emit("new_message", { success: true, data: message });
      } catch (error) {
        socket.emit("chat_error", { message: error.message });
      }
    });
  });
};