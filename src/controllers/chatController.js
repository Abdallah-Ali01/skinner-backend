const chatService = require("../services/chatService");

exports.checkPatientChatAccess = async (req, res) => {
  try {
    const { chatId, patientId } = req.params;
    const result = await chatService.checkPatientChatAccess(chatId, patientId);
    res.status(200).json(result);
  } catch (error) {
    console.log("CHECK PATIENT CHAT ACCESS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.checkDoctorChatAccess = async (req, res) => {
  try {
    const { chatId, doctorId } = req.params;
    const result = await chatService.checkDoctorChatAccess(chatId, doctorId);
    res.status(200).json(result);
  } catch (error) {
    console.log("CHECK DOCTOR CHAT ACCESS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const result = await chatService.sendMessage(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.log("SEND MESSAGE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMessagesByChatId = async (req, res) => {
  try {
    const result = await chatService.getMessagesByChatId(req.params.chatId);
    res.status(200).json(result);
  } catch (error) {
    console.log("GET MESSAGES ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};