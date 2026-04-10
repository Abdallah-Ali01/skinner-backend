const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

/**
 * Set or replace a doctor's full weekly schedule.
 * Accepts an array of day configs, e.g.:
 * [
 *   { day_of_week: 0, start_time: "08:30", end_time: "16:30", slot_duration_minutes: 30 },
 *   { day_of_week: 1, start_time: "09:00", end_time: "15:00", slot_duration_minutes: 30 }
 * ]
 */
exports.setAvailability = async (doctorId, schedule) => {
  if (!Array.isArray(schedule) || schedule.length === 0) {
    const err = new Error("schedule must be a non-empty array");
    err.status = 400;
    throw err;
  }

  // Validate each entry
  for (const entry of schedule) {
    if (
      entry.day_of_week === undefined ||
      !entry.start_time ||
      !entry.end_time
    ) {
      const err = new Error("Each schedule entry requires day_of_week, start_time, and end_time");
      err.status = 400;
      throw err;
    }

    if (entry.day_of_week < 0 || entry.day_of_week > 6) {
      const err = new Error("day_of_week must be 0 (Sunday) to 6 (Saturday)");
      err.status = 400;
      throw err;
    }
  }

  // Delete existing schedule and insert new one (transactional)
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM doctor_availability WHERE medical_syndicate_id_card = $1`,
      [doctorId]
    );

    for (const entry of schedule) {
      await client.query(
        `INSERT INTO doctor_availability
         (availability_id, medical_syndicate_id_card, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuidv4(),
          doctorId,
          entry.day_of_week,
          entry.start_time,
          entry.end_time,
          entry.slot_duration_minutes || 30,
          entry.is_active !== undefined ? entry.is_active : true
        ]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return {
    success: true,
    message: "Availability schedule updated successfully",
    data: schedule
  };
};

/**
 * Get a doctor's full weekly schedule.
 */
exports.getAvailability = async (doctorId) => {
  const result = await pool.query(
    `SELECT
      availability_id,
      day_of_week,
      start_time,
      end_time,
      slot_duration_minutes,
      is_active
    FROM doctor_availability
    WHERE medical_syndicate_id_card = $1
    ORDER BY day_of_week ASC`,
    [doctorId]
  );

  return {
    success: true,
    data: result.rows
  };
};

/**
 * Get available time slots for a doctor on a specific date.
 * Generates all possible slots from schedule, then marks booked ones as "reserved".
 */
exports.getAvailableSlots = async (doctorId, dateStr) => {
  if (!dateStr) {
    const err = new Error("date query parameter is required (YYYY-MM-DD)");
    err.status = 400;
    throw err;
  }

  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) {
    const err = new Error("Invalid date format. Use YYYY-MM-DD");
    err.status = 400;
    throw err;
  }

  // Get the day of week (JS: 0=Sunday, 1=Monday, ... 6=Saturday)
  const dayOfWeek = targetDate.getDay();

  // Get doctor's schedule for this day
  const scheduleResult = await pool.query(
    `SELECT start_time, end_time, slot_duration_minutes, is_active
     FROM doctor_availability
     WHERE medical_syndicate_id_card = $1 AND day_of_week = $2`,
    [doctorId, dayOfWeek]
  );

  if (scheduleResult.rows.length === 0 || !scheduleResult.rows[0].is_active) {
    return {
      success: true,
      date: dateStr,
      day_of_week: dayOfWeek,
      available: false,
      message: "Doctor is not available on this day",
      slots: []
    };
  }

  const schedule = scheduleResult.rows[0];
  const slotDuration = schedule.slot_duration_minutes;

  // Generate all time slots
  const slots = [];
  const [startH, startM] = schedule.start_time.split(":").map(Number);
  const [endH, endM] = schedule.end_time.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  for (let m = startMinutes; m + slotDuration <= endMinutes; m += slotDuration) {
    const hours = Math.floor(m / 60);
    const mins = m % 60;
    const timeStr = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    slots.push(timeStr);
  }

  // Get all booked appointments for this doctor on this date
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

  // Check if slot is in the past
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const isToday = dateStr === today;

  const result = slots.map((time) => {
    let status = "available";

    if (bookedTimes.has(time)) {
      status = "reserved";
    } else if (isToday) {
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
    slots: result
  };
};

/**
 * Get available dates for a doctor in the next N days.
 * Returns dates where the doctor has active availability set.
 */
exports.getAvailableDates = async (doctorId, days = 7) => {
  // Get doctor's active days
  const scheduleResult = await pool.query(
    `SELECT day_of_week FROM doctor_availability
     WHERE medical_syndicate_id_card = $1 AND is_active = TRUE
     ORDER BY day_of_week ASC`,
    [doctorId]
  );

  const activeDays = new Set(scheduleResult.rows.map((r) => r.day_of_week));
  const availableDates = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (activeDays.has(d.getDay())) {
      availableDates.push({
        date: d.toISOString().split("T")[0],
        day_of_week: d.getDay(),
        day_name: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()]
      });
    }
  }

  return {
    success: true,
    count: availableDates.length,
    data: availableDates
  };
};
