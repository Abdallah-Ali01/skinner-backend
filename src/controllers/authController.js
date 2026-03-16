const authService = require("../services/authService");

exports.registerPatient = async (req, res) => {
  try {
    const result = await authService.registerPatient(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.registerDoctor = async (req, res) => {
  try {
    const result = await authService.registerDoctor(req.body, req.file);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.registerAdmin = async (req, res) => {
  try {
    const result = await authService.registerAdmin(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
exports.getMe = async (req, res) => {
  try {
    const result = await authService.getMe(req.user);
    res.status(200).json(result);
  } catch (error) {
    console.log("GET ME ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const result = await authService.forgotPassword(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.log("FORGOT PASSWORD ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const result = await authService.resetPassword(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.log("RESET PASSWORD ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};