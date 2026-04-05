const chatService = require("../services/chatService");

// الوظيفة اللي كانت ناقصة وسببت الـ Crash
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

// src/controllers/chatController.js
exports.sendMessage = async (req, res) => {
  try {
    const { chat_id, message_text } = req.body;
    let file_path = null;
    let original_name = null;
    let type = 'text';

    // ... (كود الـ access سيبه زي ما هو)

    if (req.file) {
      type = req.file.mimetype === 'application/pdf' ? 'file' : 'image';
      file_path = `/uploads/chat/${req.file.filename}`;
      original_name = req.file.originalname;
    }

    const message = await chatService.saveMessage({
      chat_id,
      message_text: message_text || null, // النص بتاعك "check this file" هيفضل هنا
      message_type: type,
      original_filename: original_name,
      file_url: file_path, // المسار هيروح هنا
      sender_id: req.user.id,
      sender_role: req.user.role
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMessagesByChatId = async (req, res) => {
  try {
    const { chatId } = req.params;
    const access = await chatService.checkAccess(chatId, req.user.id, req.user.role);
    
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const messages = await chatService.getMessagesByChatId(chatId);
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};