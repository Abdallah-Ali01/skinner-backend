const adminService = require("../services/adminService");

exports.getPendingDoctors = async (req, res) => {
  try {
    const result = await adminService.getPendingDoctors();
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.approveDoctor = async (req, res) => {
  try {
    const result = await adminService.approveDoctor(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.rejectDoctor = async (req, res) => {
  try {
    const result = await adminService.rejectDoctor(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getReports = async (req, res) => {
  try {
    const result = await adminService.getReports();
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.generateAdminCode = async (req, res) => {
  try {
    const result = await adminService.generateAdminCode(req.user.id);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};