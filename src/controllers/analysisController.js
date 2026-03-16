const analysisService = require("../services/analysisService");

exports.uploadAndAnalyze = async (req, res) => {
  try {
    const result = await analysisService.uploadAndAnalyze(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getAnalysisById = async (req, res) => {
  try {
    const result = await analysisService.getAnalysisById(req.params.chatId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getPatientHistory = async (req, res) => {
  try {
    const result = await analysisService.getPatientHistory(req.params.patientId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};