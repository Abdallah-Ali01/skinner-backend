const pool = require("../config/database");

/**
 * Get available time slots for a doctor on a specific date.
 * Each row in doctor_date_availability represents a single bookable slot.
 * Marks slots as reserved (booked) or unavailable (past).
 */
exports.getAvailableSlots = async (doctorId, dateStr) => {
  if (!dateStr) {
    const err = new Error("date query parameter is required (YYYY-MM-DD)");
    err.status = 400;
    throw err;
  }

  const targetDate = new Date(dateStr + "T00:00:00Z");
  if (isNaN(targetDate.getTime())) {
    const err = new Error("Invalid date format. Use YYYY-MM-DD");
    err.status = 400;
    throw err;
  }

  const dayOfWeek = targetDate.getUTCDay();

  // Get date-specific slots
  const result = await pool.query(
    `SELECT start_time, end_time
     FROM doctor_date_availability
     WHERE medical_syndicate_id_card = $1 AND available_date = $2
     ORDER BY start_time ASC`,
    [doctorId, dateStr]
  );

  if (result.rows.length === 0) {
    return {
      success: true,
      date: dateStr,
      day_of_week: dayOfWeek,
      available: false,
      message: "Doctor is not available on this day",
      slots: []
    };
  }

  // Calculate slot duration from the first entry
  const firstRow = result.rows[0];
  const [sH, sM] = firstRow.start_time.split(":").map(Number);
  const [eH, eM] = firstRow.end_time.split(":").map(Number);
  const slotDuration = (eH * 60 + eM) - (sH * 60 + sM);

  // Get booked appointments for this doctor on this date
  const bookedResult = await pool.query(
    `SELECT date FROM appointment
     WHERE medical_syndicate_id_card = $1
       AND date::date = $2::date
       AND status != 'cancelled'`,
    [doctorId, dateStr]
  );

  const bookedTimes = new Set(
    bookedResult.rows.map((row) => {
      const d = new Date(row.date);
      const h = String(d.getUTCHours()).padStart(2, "0");
      const m = String(d.getUTCMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    })
  );

  const now = new Date();

  const slots = result.rows.map((row) => {
    // PostgreSQL TIME may return "HH:MM:SS", extract "HH:MM"
    const time = row.start_time.substring(0, 5);
    let status = "available";

    if (bookedTimes.has(time)) {
      status = "reserved";
    } else {
      const [slotH, slotM] = time.split(":").map(Number);
      const slotDate = new Date(targetDate);
      slotDate.setUTCHours(slotH, slotM, 0, 0);
      if (slotDate <= now) {
        status = "unavailable";
      }
    }

    return { time, status };
  });

  return {
    success: true,
    date: dateStr,
    day_of_week: dayOfWeek,
    available: true,
    slot_duration_minutes: slotDuration,
    slots
  };
};

/**
 * Get available dates for a doctor in the next N days.
 * Only considers dates with entries in doctor_date_availability.
 */
exports.getAvailableDates = async (doctorId, days = 7) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const endDate = new Date(today);
  endDate.setUTCDate(endDate.getUTCDate() + days);
  const endDateStr = endDate.toISOString().split("T")[0];

  const result = await pool.query(
    `SELECT DISTINCT available_date
     FROM doctor_date_availability
     WHERE medical_syndicate_id_card = $1
       AND available_date >= $2::date
       AND available_date < $3::date
     ORDER BY available_date ASC`,
    [doctorId, todayStr, endDateStr]
  );

  const availableDates = result.rows.map((row) => {
    const d = new Date(row.available_date);
    return {
      date: d.toISOString().split("T")[0],
      day_of_week: d.getUTCDay(),
      day_name: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getUTCDay()]
    };
  });

  return {
    success: true,
    count: availableDates.length,
    data: availableDates
  };
};

// ─── Per-Date Availability ──────────────────────────────────────────────────

/**
 * Validate time format (HH:mm) strictly.
 */
function validateTimeFormat(timeStr, fieldName) {
  const timeRegex = /^([01]\d|2[0-1]):([0-5]\d)$/;
  if (!timeRegex.test(timeStr)) {
    const err = new Error(`${fieldName} must be in HH:mm format (00:00 to 21:59). Got: ${timeStr}`);
    err.status = 400;
    throw err;
  }
}

/**
 * Parse time string to minutes since midnight.
 */
function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Set or replace time slots for a specific date.
 * Each slot represents a single bookable time window (e.g. 09:00–09:30).
 * Validates: no past dates, working hours (09:00–21:00), slot duration (30 or 60 min),
 * start_time < end_time, no overlapping slots, no booked slot removal.
 * Empty slots array marks the date as a day-off.
 */
exports.setDateAvailability = async (doctorId, dateStr, slots) => {
  if (!dateStr) {
    const err = new Error("date is required (YYYY-MM-DD)");
    err.status = 400;
    throw err;
  }
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d.getTime())) {
    const err = new Error("Invalid date format. Use YYYY-MM-DD");
    err.status = 400;
    throw err;
  }

  // Reject past dates (UTC comparison)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (d < today) {
    const err = new Error("Cannot set availability for a past date");
    err.status = 400;
    throw err;
  }

  if (!Array.isArray(slots)) {
    const err = new Error("slots must be an array");
    err.status = 400;
    throw err;
  }

  // ── Handle day-off (empty slots array) ──
  if (slots.length === 0) {
    // Check for booked appointments before allowing day-off
    const bookedAppointments = await pool.query(
      `SELECT appointment_id, date 
       FROM appointment 
       WHERE medical_syndicate_id_card = $1 
         AND date::date = $2::date 
         AND status != 'cancelled'`,
      [doctorId, dateStr]
    );

    if (bookedAppointments.rows.length > 0) {
      const conflictingAppointments = bookedAppointments.rows.map((row) => {
        const d = new Date(row.date);
        const h = String(d.getUTCHours()).padStart(2, "0");
        const m = String(d.getUTCMinutes()).padStart(2, "0");
        return {
          appointment_id: row.appointment_id,
          time: `${h}:${m}`,
          date: row.date
        };
      });

      const err = new Error("Cannot mark day as unavailable: confirmed appointments exist");
      err.status = 409;
      err.error = "BOOKED_SLOTS_CONFLICT";
      err.conflicting_appointments = conflictingAppointments;
      throw err;
    }

    // No bookings — safe to delete all slots (mark as day-off)
    await pool.query(
      `DELETE FROM doctor_date_availability
       WHERE medical_syndicate_id_card = $1 AND available_date = $2`,
      [doctorId, dateStr]
    );

    return { success: true, message: `${dateStr} marked as day-off (unavailable)` };
  }

  // ── Validate each slot ──
  const WORKING_START = 9 * 60;  // 09:00 in minutes
  const WORKING_END = 21 * 60;   // 21:00 in minutes
  const ALLOWED_DURATIONS = [30, 60];

  for (const s of slots) {
    if (!s.start_time || !s.end_time) {
      const err = new Error("Each slot requires start_time and end_time");
      err.status = 400;
      throw err;
    }

    // Validate time format
    validateTimeFormat(s.start_time, "start_time");
    validateTimeFormat(s.end_time, "end_time");

    const startMinutes = parseTimeToMinutes(s.start_time);
    const endMinutes = parseTimeToMinutes(s.end_time);

    // start_time < end_time
    if (startMinutes >= endMinutes) {
      const err = new Error(`start_time (${s.start_time}) must be before end_time (${s.end_time})`);
      err.status = 400;
      throw err;
    }

    // Working hours: 09:00 <= start and end <= 21:00
    if (startMinutes < WORKING_START) {
      const err = new Error(`start_time (${s.start_time}) is before working hours (09:00)`);
      err.status = 400;
      throw err;
    }
    if (endMinutes > WORKING_END) {
      const err = new Error(`end_time (${s.end_time}) is after working hours (21:00)`);
      err.status = 400;
      throw err;
    }

    // Slot duration: exactly 30 or 60 minutes
    const duration = endMinutes - startMinutes;
    if (!ALLOWED_DURATIONS.includes(duration)) {
      const err = new Error(
        `Slot duration must be exactly 30 or 60 minutes. Got ${duration} minutes for ${s.start_time}-${s.end_time}`
      );
      err.status = 400;
      throw err;
    }
  }

  // ── Check for overlapping slots ──
  const sorted = [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time));
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].end_time;
    const currStart = sorted[i].start_time;
    if (currStart < prevEnd) {
      const err = new Error(
        `Overlapping slots: ${sorted[i - 1].start_time}-${prevEnd} and ${currStart}-${sorted[i].end_time}`
      );
      err.status = 400;
      throw err;
    }
  }

  // ── Check for booked slot conflicts (strict: full slot must match) ──
  
  // First, get existing slots to know the full slot definition for each booked appointment
  const existingSlots = await pool.query(
    `SELECT start_time, end_time, slot_duration_minutes
     FROM doctor_date_availability
     WHERE medical_syndicate_id_card = $1 AND available_date = $2
     ORDER BY start_time ASC`,
    [doctorId, dateStr]
  );

  // Get booked appointments
  const bookedAppointments = await pool.query(
    `SELECT appointment_id, date 
     FROM appointment 
     WHERE medical_syndicate_id_card = $1 
       AND date::date = $2::date 
       AND status != 'cancelled'`,
    [doctorId, dateStr]
  );

  if (bookedAppointments.rows.length > 0 && existingSlots.rows.length > 0) {
    // Map each booked appointment to its full slot definition
    const lockedSlots = [];
    
    for (const apptRow of bookedAppointments.rows) {
      const d = new Date(apptRow.date);
      const h = String(d.getUTCHours()).padStart(2, "0");
      const m = String(d.getUTCMinutes()).padStart(2, "0");
      const bookedTime = `${h}:${m}`;

      // Find the existing slot that contains this appointment
      const matchingSlot = existingSlots.rows.find((slot) => {
        // PostgreSQL TIME may return "HH:MM:SS", normalize to "HH:MM"
        const slotStart = slot.start_time.substring(0, 5);
        return slotStart === bookedTime;
      });

      if (matchingSlot) {
        lockedSlots.push({
          start_time: matchingSlot.start_time.substring(0, 5),
          end_time: matchingSlot.end_time.substring(0, 5),
          duration: matchingSlot.slot_duration_minutes,
          appointment_id: apptRow.appointment_id,
          appointment_date: apptRow.date
        });
      }
    }

    // Now check if all locked slots exist EXACTLY in the new slots array
    const conflictingSlots = [];
    
    for (const locked of lockedSlots) {
      const exactMatch = slots.find(
        (s) => s.start_time === locked.start_time && s.end_time === locked.end_time
      );

      if (!exactMatch) {
        conflictingSlots.push({
          appointment_id: locked.appointment_id,
          appointment_date: locked.appointment_date,
          locked_slot: {
            start_time: locked.start_time,
            end_time: locked.end_time,
            duration_minutes: locked.duration
          },
          reason: exactMatch === undefined 
            ? "Slot removed or start_time changed" 
            : "Slot duration or end_time changed"
        });
      }
    }

    if (conflictingSlots.length > 0) {
      const err = new Error("Cannot modify or remove slots with confirmed bookings. Booked slots must remain exactly as defined.");
      err.status = 409;
      err.error = "BOOKED_SLOTS_CONFLICT";
      err.conflicting_slots = conflictingSlots;
      throw err;
    }
  }

  // ── All validations passed — update availability ──
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Remove existing entries for this doctor + date
    await client.query(
      `DELETE FROM doctor_date_availability
       WHERE medical_syndicate_id_card = $1 AND available_date = $2`,
      [doctorId, dateStr]
    );

    // Insert new slots
    for (const s of slots) {
      const startMinutes = parseTimeToMinutes(s.start_time);
      const endMinutes = parseTimeToMinutes(s.end_time);
      const duration = endMinutes - startMinutes;

      await client.query(
        `INSERT INTO doctor_date_availability
         (medical_syndicate_id_card, available_date, start_time, end_time, slot_duration_minutes, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [doctorId, dateStr, s.start_time, s.end_time, duration]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return { success: true, message: `Availability for ${dateStr} saved successfully` };
};

/**
 * Get date-specific availability for a doctor within a date range.
 */
exports.getDateAvailability = async (doctorId, startDate, endDate) => {
  if (!startDate || !endDate) {
    const err = new Error("start_date and end_date query parameters are required");
    err.status = 400;
    throw err;
  }
  const result = await pool.query(
    `SELECT id, available_date, start_time, end_time, slot_duration_minutes
     FROM doctor_date_availability
     WHERE medical_syndicate_id_card = $1
       AND available_date >= $2::date
       AND available_date <= $3::date
     ORDER BY available_date ASC, start_time ASC`,
    [doctorId, startDate, endDate]
  );
  return { success: true, data: result.rows };
};

/**
 * Remove all availability entries for a specific date.
 * Validates: no past dates, no booked appointments.
 */
exports.removeDateAvailability = async (doctorId, dateStr) => {
  if (!dateStr) {
    const err = new Error("date is required (YYYY-MM-DD)");
    err.status = 400;
    throw err;
  }

  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d.getTime())) {
    const err = new Error("Invalid date format. Use YYYY-MM-DD");
    err.status = 400;
    throw err;
  }

  // Reject past dates
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (d < today) {
    const err = new Error("Cannot remove availability for a past date");
    err.status = 400;
    throw err;
  }

  // Check for booked appointments
  const bookedAppointments = await pool.query(
    `SELECT appointment_id, date 
     FROM appointment 
     WHERE medical_syndicate_id_card = $1 
       AND date::date = $2::date 
       AND status != 'cancelled'`,
    [doctorId, dateStr]
  );

  if (bookedAppointments.rows.length > 0) {
    const conflictingAppointments = bookedAppointments.rows.map((row) => {
      const d = new Date(row.date);
      const h = String(d.getUTCHours()).padStart(2, "0");
      const m = String(d.getUTCMinutes()).padStart(2, "0");
      return {
        appointment_id: row.appointment_id,
        time: `${h}:${m}`,
        date: row.date
      };
    });

    const err = new Error("Cannot remove availability: confirmed appointments exist");
    err.status = 409;
    err.error = "BOOKED_SLOTS_CONFLICT";
    err.conflicting_appointments = conflictingAppointments;
    throw err;
  }

  // Safe to delete
  await pool.query(
    `DELETE FROM doctor_date_availability
     WHERE medical_syndicate_id_card = $1 AND available_date = $2`,
    [doctorId, dateStr]
  );

  return { success: true, message: `Availability for ${dateStr} removed` };
};
