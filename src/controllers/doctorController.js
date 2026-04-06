const doctorService = require("../services/doctorService");

exports.getPendingCases = async (req, res) => {
  try {
    // Use doctor ID from JWT token, not query params (prevents viewing other doctors' cases)
    const doctor_id = req.user.id;
    const result = await doctorService.getPendingCases(doctor_id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getReviewedCases = async (req, res) => {
  try {
    const doctor_id = req.user.id;
    const result = await doctorService.getReviewedCases(doctor_id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCaseDetails = async (req, res) => {
  try {
    const doctor_id = req.user.id;
    const result = await doctorService.getCaseDetails(doctor_id, req.params.appointmentId);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.reviewCase = async (req, res) => {
  try {
    const result = await doctorService.reviewCase(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};