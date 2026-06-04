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
    // Join personal room for real-time notification updates outside the active chat
    socket.join(socket.user.id);

    // Join admins room for administrative real-time updates
    if (socket.user.role === "admin") {
      socket.join("admins");
    }

    socket.on("join_chat", async ({ chat_id }) => {
      try {
        const access = await chatService.checkAccess(chat_id, socket.user.id, socket.user.role);
        if (!access.allowed) {
          return socket.emit("chat_error", { message: "Access denied or payment required" });
        }
        socket.join(chat_id);
        socket.emit("joined_chat", { chat_id, status: access.status });
      } catch (error) {
        socket.emit("chat_error", { message: error.message });
      }
    });

    socket.on("send_message", async ({ chat_id, message_text }) => {
      try {
        // Access + status check before saving
        const access = await chatService.checkAccess(chat_id, socket.user.id, socket.user.role);
        if (!access.allowed) return socket.emit("chat_error", { message: "Unauthorized" });

        // Block sends to locked chats
        if (access.status === 'locked') {
          return socket.emit("chat_error", {
            message: "Chat is locked. Book a new appointment to reopen."
          });
        }

        const message = await chatService.saveMessage({
          chat_id,
          sender_id: socket.user.id,
          sender_role: socket.user.role,
          message_text
        });

        io.to(chat_id).emit("new_message", { success: true, data: message });

        // Emit unread update to the recipient's personal room
        try {
          const chatInfo = await chatService.getChatStatus(chat_id);
          if (chatInfo) {
            const recipientId = socket.user.role === 'patient' ? chatInfo.medical_syndicate_id_card : chatInfo.patient_id;
            io.to(recipientId).emit("unread_update", {
              chat_id,
              sender_id: socket.user.id,
              sender_role: socket.user.role,
              message
            });
          }
        } catch (err) {
          console.error("Failed to emit unread_update:", err);
        }
      } catch (error) {
        socket.emit("chat_error", { message: error.message });
      }
    });
  });
};