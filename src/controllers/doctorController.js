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
    const doctor_id = req.user.id;
    const result = await doctorService.reviewCase(doctor_id, req.body);

    if (result.success && result.data && result.data.chat_id && result.data.chat_message) {
      const io = req.app.get("io");
      if (io) {
        const { chat_id, chat_message, patient_id } = result.data;
        io.to(chat_id).emit("new_message", { success: true, data: chat_message });
        try {
          io.to(patient_id).emit("unread_update", {
            chat_id,
            sender_id: doctor_id,
            sender_role: "system",
            message: chat_message
          });
        } catch (socketErr) {
          console.error("Failed to emit report unread_update:", socketErr);
        }
      }
    }

    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateReport = async (req, res) => {
  try {
    const doctor_id = req.user.id;
    const result = await doctorService.updateReport(doctor_id, req.body);

    if (result.success && result.data && result.data.chat_id && result.data.chat_message) {
      const io = req.app.get("io");
      if (io) {
        const { chat_id, chat_message, patient_id } = result.data;
        io.to(chat_id).emit("new_message", { success: true, data: chat_message });
        try {
          io.to(patient_id).emit("unread_update", {
            chat_id,
            sender_id: doctor_id,
            sender_role: "system",
            message: chat_message
          });
        } catch (socketErr) {
          console.error("Failed to emit report update unread_update:", socketErr);
        }
      }
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};