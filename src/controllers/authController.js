const authService = require("../services/authService");

exports.registerPatient = async (req, res) => {
  try {
    const result = await authService.registerPatient(req.body);

    // Emit socket event to admins room in real-time
    try {
      const io = req.app.get("io");
      if (io) {
        io.to("admins").emit("patient_registered", result.data);
      }
    } catch (socketErr) {
      console.error("Failed to broadcast patient_registered socket event:", socketErr);
    }

    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.registerDoctor = async (req, res) => {
  try {
    const result = await authService.registerDoctor(req.body, req.file);

    // Emit socket event to admins room in real-time
    try {
      const io = req.app.get("io");
      if (io) {
        io.to("admins").emit("new_pending_doctor", result.data);
      }
    } catch (socketErr) {
      console.error("Failed to broadcast new_pending_doctor socket event:", socketErr);
    }

    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.registerAdmin = async (req, res) => {
  try {
    const result = await authService.registerAdmin(req.body);

    // Emit socket event to admins room in real-time indicating invite code used
    try {
      const io = req.app.get("io");
      if (io) {
        io.to("admins").emit("invite_code_used", {
          invite_code: req.body.invite_code,
          email: result.data.email,
          used_at: new Date().toISOString()
        });
        io.to("admins").emit("admin_registered", result.data);
      }
    } catch (socketErr) {
      console.error("Failed to broadcast invite_code_used/admin_registered socket event:", socketErr);
    }

    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
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
    res.status(error.status || 500).json({
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
    res.status(error.status || 500).json({
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
    res.status(error.status || 500).json({
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
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};