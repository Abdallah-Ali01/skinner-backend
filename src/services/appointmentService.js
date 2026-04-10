const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

exports.bookAppointment = async (patientId, data) => {
  const {
    medical_syndicate_id_card,
    date,
    analysis_id
  } = data;

  if (!medical_syndicate_id_card || !date || !analysis_id) {
    const err = new Error("medical_syndicate_id_card, date, and analysis_id are required");
    err.status = 400;
    throw err;
  }

  // Look up doctor from DB — auto-resolve name and fee instead of trusting client input
  const doctorResult = await pool.query(
    `SELECT name, consultation_fee FROM doctor WHERE medical_syndicate_id_card = $1 AND approval_status = 'approved'`,
    [medical_syndicate_id_card]
  );

  if (doctorResult.rows.length === 0) {
    const err = new Error("Doctor not found or not approved");
    err.status = 404;
    throw err;
  }

  const doctor = doctorResult.rows[0];
  const doctor_name = doctor.name;
  const consultation_fee = parseFloat(doctor.consultation_fee) || 0;
  const service_fee = parseFloat((consultation_fee * 0.20).toFixed(2));
  const total_cost = parseFloat((consultation_fee + service_fee).toFixed(2));

  const analysisCheck = await pool.query(
    `SELECT 1 FROM analysis WHERE analysis_id = $1 AND patient_id = $2`,
    [analysis_id, patientId]
  );

  if (analysisCheck.rows.length === 0) {
    const err = new Error("Analysis not found for this patient");
    err.status = 404;
    throw err;
  }

  const existingAppointment = await pool.query(
    `SELECT 1 FROM appointment WHERE analysis_id = $1`,
    [analysis_id]
  );

  if (existingAppointment.rows.length > 0) {
    const err = new Error("This analysis already has an appointment");
    err.status = 409;
    throw err;
  }

  // Block booking if the patient has an unreviewed appointment with this doctor
  const unreviewedWithDoctor = await pool.query(`
    SELECT a.appointment_id
    FROM appointment a
    LEFT JOIN report r ON a.appointment_id = r.appointment_id
    WHERE a.patient_id = $1
      AND a.medical_syndicate_id_card = $2
      AND a.status != 'cancelled'
      AND r.appointment_id IS NULL
  `, [patientId, medical_syndicate_id_card]);

  if (unreviewedWithDoctor.rows.length > 0) {
    const err = new Error("You already have a pending appointment with this doctor that hasn't been reviewed yet");
    err.status = 409;
    throw err;
  }

  // ── Time slot validation ──────────────────────────────────────
  const appointmentDate = new Date(date);
  if (isNaN(appointmentDate.getTime())) {
    const err = new Error("Invalid date format");
    err.status = 400;
    throw err;
  }

  const dayOfWeek = appointmentDate.getUTCDay();

  // Check doctor has availability for this day
  const availResult = await pool.query(
    `SELECT start_time, end_time, slot_duration_minutes, is_active
     FROM doctor_availability
     WHERE medical_syndicate_id_card = $1 AND day_of_week = $2`,
    [medical_syndicate_id_card, dayOfWeek]
  );

  if (availResult.rows.length === 0 || !availResult.rows[0].is_active) {
    const err = new Error("Doctor is not available on this day");
    err.status = 400;
    throw err;
  }

  const schedule = availResult.rows[0];
  const appointmentTimeStr = `${String(appointmentDate.getUTCHours()).padStart(2, "0")}:${String(appointmentDate.getUTCMinutes()).padStart(2, "0")}`;

  // Validate time is within doctor's working hours
  const [startH, startM] = schedule.start_time.split(":").map(Number);
  const [endH, endM] = schedule.end_time.split(":").map(Number);
  const scheduleStart = startH * 60 + startM;
  const scheduleEnd = endH * 60 + endM;
  const slotDuration = schedule.slot_duration_minutes;

  const [apptH, apptM] = appointmentTimeStr.split(":").map(Number);
  const apptMinutes = apptH * 60 + apptM;

  if (apptMinutes < scheduleStart || apptMinutes + slotDuration > scheduleEnd) {
    const err = new Error("Selected time is outside the doctor's working hours");
    err.status = 400;
    throw err;
  }

  // Validate time aligns with slot boundaries
  if ((apptMinutes - scheduleStart) % slotDuration !== 0) {
    const err = new Error("Selected time does not align with available time slots");
    err.status = 400;
    throw err;
  }

  // Check for double-booking on same doctor + date + time
  const dateStr = appointmentDate.toISOString().split("T")[0];
  const conflictCheck = await pool.query(
    `SELECT 1 FROM appointment
     WHERE medical_syndicate_id_card = $1
       AND date::date = $2::date
       AND EXTRACT(HOUR FROM date) = $3
       AND EXTRACT(MINUTE FROM date) = $4
       AND status != 'cancelled'`,
    [medical_syndicate_id_card, dateStr, apptH, apptM]
  );

  if (conflictCheck.rows.length > 0) {
    const err = new Error("This time slot is already booked");
    err.status = 409;
    throw err;
  }
  // ── End time slot validation ──────────────────────────────────

  const appointmentId = uuidv4();

  await pool.query(
    `INSERT INTO appointment
    (appointment_id, patient_id, doctor_name, total_cost, date, status, medical_syndicate_id_card, analysis_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [appointmentId, patientId, doctor_name, total_cost, date, "pending_payment", medical_syndicate_id_card, analysis_id]
  );

  return {
    success: true,
    message: "Appointment booked successfully",
    data: {
      appointment_id: appointmentId,
      patient_id: patientId,
      medical_syndicate_id_card,
      doctor_name,
      consultation_fee,
      service_fee,
      total_cost,
      date,
      status: "pending_payment",
      analysis_id
    }
  };
};

exports.getMyAppointments = async (userId, role) => {
  let query;
  let values = [userId];

  if (role === "patient") {
    query = `
      SELECT
        a.appointment_id, a.patient_id, a.doctor_name, a.total_cost,
        a.date, a.status, a.medical_syndicate_id_card, a.analysis_id,
        an.skin_disease_classification, an.skin_image_upload,
        c.chat_id
      FROM appointment a
      LEFT JOIN analysis an ON a.analysis_id = an.analysis_id
      LEFT JOIN chat c ON a.appointment_id = c.appointment_id
      WHERE a.patient_id = $1
      ORDER BY a.date DESC`;
  } else if (role === "doctor") {
    query = `
      SELECT
        a.appointment_id, a.patient_id, a.doctor_name, a.total_cost,
        a.date, a.status, a.medical_syndicate_id_card, a.analysis_id,
        p.name AS patient_name, p.email AS patient_email,
        an.skin_disease_classification, an.skin_image_upload,
        c.chat_id
      FROM appointment a
      LEFT JOIN patient p ON a.patient_id = p.patient_id
      LEFT JOIN analysis an ON a.analysis_id = an.analysis_id
      LEFT JOIN chat c ON a.appointment_id = c.appointment_id
      WHERE a.medical_syndicate_id_card = $1
      ORDER BY a.date DESC`;
  } else {
    const err = new Error("Invalid role");
    err.status = 400;
    throw err;
  }

  const result = await pool.query(query, values);

  return {
    success: true,
    count: result.rows.length,
    data: result.rows
  };
};

exports.getMyReports = async (patientId) => {
  const result = await pool.query(`
    SELECT
      r.report_id,
      r.appointment_id,
      r.diagnosis,
      r.prescription,
      r.notes,
      r.created_at,
      d.name AS doctor_name,
      d.specialization,
      a.date AS appointment_date,
      an.skin_disease_classification,
      an.skin_image_upload,
      c.chat_id
    FROM report r
    JOIN appointment a ON r.appointment_id = a.appointment_id
    JOIN doctor d ON r.medical_syndicate_id_card = d.medical_syndicate_id_card
    JOIN analysis an ON a.analysis_id = an.analysis_id
    LEFT JOIN chat c ON a.appointment_id = c.appointment_id
    WHERE r.patient_id = $1
    ORDER BY r.created_at DESC
  `, [patientId]);

  return {
    success: true,
    count: result.rows.length,
    data: result.rows
  };
};

exports.getReportByAppointmentId = async (appointmentId, user) => {
  const result = await pool.query(`
    SELECT
      r.report_id,
      r.appointment_id,
      r.patient_id,
      r.medical_syndicate_id_card,
      r.diagnosis,
      r.prescription,
      r.notes,
      r.created_at,
      d.name AS doctor_name,
      d.specialization,
      p.name AS patient_name,
      a.date AS appointment_date,
      an.skin_disease_classification,
      an.skin_image_upload,
      an.analysis,
      an.treatment_suggestion,
      c.chat_id
    FROM report r
    JOIN appointment a ON r.appointment_id = a.appointment_id
    JOIN doctor d ON r.medical_syndicate_id_card = d.medical_syndicate_id_card
    JOIN patient p ON r.patient_id = p.patient_id
    JOIN analysis an ON a.analysis_id = an.analysis_id
    LEFT JOIN chat c ON a.appointment_id = c.appointment_id
    WHERE r.appointment_id = $1
  `, [appointmentId]);

  if (result.rows.length === 0) {
    const err = new Error("Report not found");
    err.status = 404;
    throw err;
  }

  const report = result.rows[0];

  // Ownership check
  if (user.role === "patient" && report.patient_id !== user.id) {
    const err = new Error("Access denied");
    err.status = 403;
    throw err;
  }
  if (user.role === "doctor" && report.medical_syndicate_id_card !== user.id) {
    const err = new Error("Access denied");
    err.status = 403;
    throw err;
  }

  return {
    success: true,
    data: report
  };
};