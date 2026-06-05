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
    const result = await adminService.approveDoctor(req.user.id, req.body);

    // Emit socket event to admins room in real-time
    try {
      const io = req.app.get("io");
      if (io) {
        io.to("admins").emit("doctor_status_changed", {
          medical_syndicate_id_card: req.body.medical_syndicate_id_card,
          status: "approved"
        });
      }
    } catch (socketErr) {
      console.error("Failed to broadcast doctor_status_changed (approved) socket event:", socketErr);
    }

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

    // Emit socket event to admins room in real-time
    try {
      const io = req.app.get("io");
      if (io) {
        io.to("admins").emit("doctor_status_changed", {
          medical_syndicate_id_card: req.body.medical_syndicate_id_card,
          status: "rejected"
        });
      }
    } catch (socketErr) {
      console.error("Failed to broadcast doctor_status_changed (rejected) socket event:", socketErr);
    }

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

exports.getActiveInviteCode = async (req, res) => {
  try {
    const result = await adminService.getActiveInviteCode(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const result = await adminService.getStats();
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getAnalyses = async (req, res) => {
  try {
    const result = await adminService.getAnalyses();
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const result = await adminService.getUsers();
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};