const patientDoctorService = require("../services/patientDoctorService");

exports.listDoctors = async (req, res) => {
  try {
    const result = await patientDoctorService.listDoctors(req.query);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getDoctorById = async (req, res) => {
  try {
    const result = await patientDoctorService.getDoctorById(req.params.doctorId);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};
