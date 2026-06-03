const chatService = require("../services/chatService");

exports.checkChatAccess = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { id: userId, role } = req.user;

    const result = await chatService.checkAccess(chatId, userId, role);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { chat_id, message_text } = req.body;

    if (!chat_id) {
      return res.status(400).json({ success: false, message: "chat_id is required" });
    }

    // Access check — only allow if user belongs to this chat
    const access = await chatService.checkAccess(chat_id, req.user.id, req.user.role);
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: "Access denied or payment required" });
    }

    // Lock check — reject sends to locked chats
    if (access.status === 'locked') {
      return res.status(403).json({
        success: false,
        message: "Chat is locked. Book a new appointment with this doctor to reopen."
      });
    }

    let file_url = null;
    let original_name = null;
    let type = 'text';

    if (req.file) {
      type = req.file.mimetype === 'application/pdf' ? 'file' : 'image';
      file_url = `/uploads/chat/${req.file.filename}`;
      original_name = req.file.originalname;
    }

    if (!message_text && !req.file) {
      return res.status(400).json({ success: false, message: "message_text or file is required" });
    }

    const message = await chatService.saveMessage({
      chat_id,
      message_text: message_text || null,
      message_type: type,
      original_filename: original_name,
      file_url,
      sender_id: req.user.id,
      sender_role: req.user.role
    });

    // Broadcast via socket.io
    const io = req.app.get("io");
    if (io) {
      io.to(chat_id).emit("new_message", { success: true, data: message });

      try {
        const chatInfo = await chatService.getChatStatus(chat_id);
        if (chatInfo) {
          const recipientId = req.user.role === 'patient' ? chatInfo.medical_syndicate_id_card : chatInfo.patient_id;
          io.to(recipientId).emit("unread_update", {
            chat_id,
            sender_id: req.user.id,
            sender_role: req.user.role,
            message
          });
        }
      } catch (err) {
        console.error("Failed to emit HTTP-triggered unread_update:", err);
      }
    }

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMessagesByChatId = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { peek } = req.query;
    const access = await chatService.checkAccess(chatId, req.user.id, req.user.role);
    
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (peek !== "true") {
      // Automatically mark all received messages in this chat as read
      await chatService.markChatAsRead(chatId, req.user.role);
    }

    const messages = await chatService.getMessagesByChatId(chatId);
    res.status(200).json({ success: true, data: messages, chat_status: access.status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyChats = async (req, res) => {
  try {
    const result = await chatService.getMyChats(req.user.id, req.user.role);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};