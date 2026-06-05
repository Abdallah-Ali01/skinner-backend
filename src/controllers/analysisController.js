const analysisService = require("../services/analysisService");

exports.uploadAndAnalyze = async (req, res) => {
  try {
    const result = await analysisService.uploadAndAnalyze(req);

    // Emit socket event to admins room in real-time
    try {
      const io = req.app.get("io");
      if (io) {
        io.to("admins").emit("new_analysis_performed", result.data);
      }
    } catch (socketErr) {
      console.error("Failed to broadcast new_analysis_performed socket event:", socketErr);
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getAnalysisById = async (req, res) => {
  try {
    const result = await analysisService.getAnalysisById(req.params.analysisId, req.user);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getPatientHistory = async (req, res) => {
  try {
    const result = await analysisService.getPatientHistory(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};