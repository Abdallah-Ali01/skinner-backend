const availabilityService = require("../services/availabilityService");

exports.getAvailableDates = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const result = await availabilityService.getAvailableDates(req.params.doctorId, days);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getAvailableSlots = async (req, res) => {
  try {
    const result = await availabilityService.getAvailableSlots(req.params.doctorId, req.query.date);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── Per-Date Availability ───────────────────────────────────────────────

exports.setDateAvailability = async (req, res) => {
  try {
    const { date, slots } = req.body;
    const result = await availabilityService.setDateAvailability(req.user.id, date, slots);
    res.status(200).json(result);
  } catch (error) {
    // Handle 409 conflict with custom error structure
    if (error.status === 409 && error.error === "BOOKED_SLOTS_CONFLICT") {
      return res.status(409).json({
        success: false,
        error: error.error,
        message: error.message,
        conflicting_appointments: error.conflicting_appointments,
        conflicting_slots: error.conflicting_slots
      });
    }
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getDateAvailability = async (req, res) => {
  try {
    const result = await availabilityService.getDateAvailability(
      req.user.id,
      req.query.start_date,
      req.query.end_date
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.removeDateAvailability = async (req, res) => {
  try {
    const result = await availabilityService.removeDateAvailability(req.user.id, req.params.date);
    res.status(200).json(result);
  } catch (error) {
    // Handle 409 conflict with custom error structure
    if (error.status === 409 && error.error === "BOOKED_SLOTS_CONFLICT") {
      return res.status(409).json({
        success: false,
        error: error.error,
        message: error.message,
        conflicting_appointments: error.conflicting_appointments
      });
    }
    res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};
