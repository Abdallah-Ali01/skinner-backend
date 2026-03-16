const pool = require("../config/database");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

module.exports = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id, socket.user);

    socket.on("join_chat", async ({ chat_id }) => {
      try {
        if (!chat_id) {
          socket.emit("chat_error", {
            success: false,
            message: "chat_id is required"
          });
          return;
        }

        const access = await checkChatAccess(chat_id, socket.user);

        if (!access.allowed) {
          socket.emit("chat_error", {
            success: false,
            message: "You are not allowed to join this chat"
          });
          return;
        }

        socket.join(chat_id);

        socket.emit("joined_chat", {
          success: true,
          chat_id
        });
      } catch (error) {
        socket.emit("chat_error", {
          success: false,
          message: error.message
        });
      }
    });

    socket.on("send_message", async ({ chat_id, message_text }) => {
      try {
        if (!chat_id || !message_text) {
          socket.emit("chat_error", {
            success: false,
            message: "chat_id and message_text are required"
          });
          return;
        }

        const access = await checkChatAccess(chat_id, socket.user);

        if (!access.allowed) {
          socket.emit("chat_error", {
            success: false,
            message: "You are not allowed to send messages in this chat"
          });
          return;
        }

        const messageId = uuidv4();
        const senderRole = socket.user.role;
        const senderId = String(socket.user.id);

        await pool.query(
          `
          INSERT INTO chat_message
          (message_id, chat_id, sender_role, sender_id, message_text, sent_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [messageId, chat_id, senderRole, senderId, message_text, new Date()]
        );

        const payload = {
          success: true,
          data: {
            message_id: messageId,
            chat_id,
            sender_role: senderRole,
            sender_id: senderId,
            message_text,
            sent_at: new Date().toISOString()
          }
        };

        io.to(chat_id).emit("new_message", payload);
      } catch (error) {
        socket.emit("chat_error", {
          success: false,
          message: error.message
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};

async function checkChatAccess(chatId, user) {
  if (!user || !user.role || !user.id) {
    return { allowed: false };
  }

  if (user.role === "patient") {
    const result = await pool.query(
      `
      SELECT a.appointment_id
      FROM appointment a
      JOIN payment p
        ON a.appointment_id = p.appointment_id
      WHERE a.chat_id = $1
        AND a.patient_id = $2
        AND p.payment_status = 'paid'
      `,
      [chatId, user.id]
    );

    return { allowed: result.rows.length > 0 };
  }

  if (user.role === "doctor") {
    const result = await pool.query(
      `
      SELECT a.appointment_id
      FROM appointment a
      JOIN payment p
        ON a.appointment_id = p.appointment_id
      WHERE a.chat_id = $1
        AND a.medical_syndicate_id_card = $2
        AND p.payment_status = 'paid'
      `,
      [chatId, user.id]
    );

    return { allowed: result.rows.length > 0 };
  }

  return { allowed: false };
}