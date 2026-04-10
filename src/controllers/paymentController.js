const paymentService = require("../services/paymentService");

exports.payAppointment = async (req, res) => {
  try {
    const result = await paymentService.payAppointment(req.user.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getPaymentByAppointmentId = async (req, res) => {
  try {
    const result = await paymentService.getPaymentByAppointmentId(req.params.appointmentId, req.user);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMyPayments = async (req, res) => {
  try {
    const result = await paymentService.getPatientPayments(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};