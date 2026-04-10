const appointmentService = require("../services/appointmentService");

exports.bookAppointment = async (req, res) => {
  try {
    const result = await appointmentService.bookAppointment(req.user.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMyAppointments = async (req, res) => {
  try {
    const result = await appointmentService.getMyAppointments(req.user.id, req.user.role);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMyReports = async (req, res) => {
  try {
    const result = await appointmentService.getMyReports(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getReportByAppointmentId = async (req, res) => {
  try {
    const result = await appointmentService.getReportByAppointmentId(req.params.appointmentId, req.user);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};