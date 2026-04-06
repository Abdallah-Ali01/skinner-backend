const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

exports.bookAppointment = async (data) => {
  const {
    patient_id,
    medical_syndicate_id_card,
    doctor_name,
    total_cost,
    date,
    analysis_id
  } = data;

  if (
    !patient_id ||
    !medical_syndicate_id_card ||
    !doctor_name ||
    !total_cost ||
    !date ||
    !analysis_id
  ) {
    const err = new Error("patient_id, medical_syndicate_id_card, doctor_name, total_cost, date, and analysis_id are required");
    err.status = 400;
    throw err;
  }

  const patientCheck = await pool.query(
    `SELECT 1 FROM patient WHERE patient_id = $1`,
    [patient_id]
  );

  if (patientCheck.rows.length === 0) {
    const err = new Error("Patient not found");
    err.status = 404;
    throw err;
  }

  const doctorCheck = await pool.query(
    `SELECT 1 FROM doctor WHERE medical_syndicate_id_card = $1 AND approval_status = 'approved'`,
    [medical_syndicate_id_card]
  );

  if (doctorCheck.rows.length === 0) {
    const err = new Error("Doctor not found or not approved");
    err.status = 404;
    throw err;
  }

  const analysisCheck = await pool.query(
    `SELECT 1 FROM analysis WHERE analysis_id = $1 AND patient_id = $2`,
    [analysis_id, patient_id]
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

  const appointmentId = uuidv4();

  await pool.query(
    `
    INSERT INTO appointment
    (appointment_id, patient_id, doctor_name, total_cost, date, status, medical_syndicate_id_card, analysis_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [appointmentId, patient_id, doctor_name, total_cost, date, "pending_payment", medical_syndicate_id_card, analysis_id]
  );

  return {
    success: true,
    message: "Appointment booked successfully",
    data: {
      appointment_id: appointmentId,
      patient_id,
      medical_syndicate_id_card,
      doctor_name,
      total_cost,
      date,
      status: "pending_payment",
      analysis_id
    }
  };
};

exports.getPatientAppointments = async (patientId) => {
  const result = await pool.query(
    `
    SELECT
      a.appointment_id,
      a.patient_id,
      a.doctor_name,
      a.total_cost,
      a.date,
      a.status,
      a.medical_syndicate_id_card,
      a.analysis_id,
      an.skin_disease_classification,
      an.skin_image_upload,
      c.chat_id
    FROM appointment a
    LEFT JOIN analysis an ON a.analysis_id = an.analysis_id
    LEFT JOIN chat c ON a.appointment_id = c.appointment_id
    WHERE a.patient_id = $1
    ORDER BY a.date DESC
    `,
    [patientId]
  );

  return {
    success: true,
    count: result.rows.length,
    data: result.rows
  };
};

exports.getDoctorAppointments = async (doctorId) => {
  const result = await pool.query(
    `
    SELECT
      a.appointment_id,
      a.patient_id,
      a.doctor_name,
      a.total_cost,
      a.date,
      a.status,
      a.medical_syndicate_id_card,
      a.analysis_id,
      p.name AS patient_name,
      p.email AS patient_email,
      an.skin_disease_classification,
      an.skin_image_upload,
      c.chat_id
    FROM appointment a
    LEFT JOIN patient p ON a.patient_id = p.patient_id
    LEFT JOIN analysis an ON a.analysis_id = an.analysis_id
    LEFT JOIN chat c ON a.appointment_id = c.appointment_id
    WHERE a.medical_syndicate_id_card = $1
    ORDER BY a.date DESC
    `,
    [doctorId]
  );

  return {
    success: true,
    count: result.rows.length,
    data: result.rows
  };
};