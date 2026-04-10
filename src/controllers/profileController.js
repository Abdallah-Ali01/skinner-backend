const profileService = require("../services/profileService");

exports.updateProfile = async (req, res) => {
  try {
    let result;

    if (req.user.role === "patient") {
      result = await profileService.updatePatientProfile(req.user.id, req.body);
    } else if (req.user.role === "doctor") {
      result = await profileService.updateDoctorProfile(req.user.id, req.body);
    } else {
      return res.status(400).json({
        success: false,
        message: "Profile update not supported for this role"
      });
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};
