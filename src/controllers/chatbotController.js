const chatbotService = require("../services/chatbotService");

exports.sendMessage = async (req, res) => {
  try {
    const result = await chatbotService.sendMessage({
      userId: req.user.id,
      role: req.user.role,
      query: req.body.query,
      conversationId: req.body.conversation_id || null,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const result = await chatbotService.getConversations({
      userId: req.user.id,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getConversationMessages = async (req, res) => {
  try {
    const result = await chatbotService.getConversationMessages({
      userId: req.user.id,
      conversationId: req.params.conversationId,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const result = await chatbotService.deleteConversation({
      userId: req.user.id,
      conversationId: req.params.conversationId,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};
