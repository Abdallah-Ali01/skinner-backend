const paymentService = require("../services/paymentService");

exports.payAppointment = async (req, res) => {
  try {
    const result = await paymentService.payAppointment(req.user.id, req.body);
    
    // Broadcast via socket.io if payment is successful
    try {
      const io = req.app.get("io");
      if (io && result.data && result.data.medical_syndicate_id_card) {
        io.to(result.data.medical_syndicate_id_card).emit("appointment_booked", {
          appointment_id: result.data.appointment_id,
          chat_id: result.data.chat_id
        });
      }
    } catch (socketError) {
      console.error("Error sending socket notification for booked appointment:", socketError);
    }

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