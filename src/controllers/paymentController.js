const paymentService = require("../services/paymentService");

exports.payAppointment = async (req, res) => {
  try {
    const result = await paymentService.payAppointment(req.body);
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
    const result = await paymentService.getPaymentByAppointmentId(req.params.appointmentId);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getPatientPayments = async (req, res) => {
  try {
    const result = await paymentService.getPatientPayments(req.params.patientId);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};