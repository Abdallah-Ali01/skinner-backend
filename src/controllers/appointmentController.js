const appointmentService = require("../services/appointmentService");

exports.bookAppointment = async (req, res) => {
  try {
    const result = await appointmentService.bookAppointment(req.body);

    res.status(201).json(result);

  } catch (error) {

    console.log("BOOK APPOINTMENT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


exports.getPatientAppointments = async (req, res) => {
  try {

    const result = await appointmentService.getPatientAppointments(
      req.params.patientId
    );

    res.status(200).json(result);

  } catch (error) {

    console.log("GET PATIENT APPOINTMENTS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


exports.getDoctorAppointments = async (req, res) => {
  try {

    const result = await appointmentService.getDoctorAppointments(
      req.params.doctorId
    );

    res.status(200).json(result);

  } catch (error) {

    console.log("GET DOCTOR APPOINTMENTS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};