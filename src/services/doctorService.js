const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

exports.getPendingCases = async (doctorId) => {
  const result = await pool.query(`
    SELECT
      a.appointment_id,
      a.analysis_id,
      a.patient_id,
      a.date AS appointment_date,
      a.status AS appointment_status,
      p.name AS patient_name,
      p.age,
      p.gender,
      p.email,
      p.phone,
      an.skin_image_upload,
      an.skin_disease_classification,
      an.analysis,
      an.treatment_suggestion,
      an.doctor_recommendation,
      an.created_at AS analysis_date,
      c.chat_id,
      pay.payment_status
    FROM appointment a
    JOIN patient p ON a.patient_id = p.patient_id
    JOIN analysis an ON a.analysis_id = an.analysis_id
    JOIN payment pay ON a.appointment_id = pay.appointment_id
    LEFT JOIN chat c ON a.appointment_id = c.appointment_id
    LEFT JOIN report r ON a.appointment_id = r.appointment_id
    WHERE a.medical_syndicate_id_card = $1
      AND pay.payment_status = 'paid'
      AND r.appointment_id IS NULL
    ORDER BY a.date DESC
  `, [doctorId]);

  return {
    success: true,
    count: result.rows.length,
    data: result.rows
  };
};

exports.getReviewedCases = async (doctorId) => {
  const result = await pool.query(`
    SELECT
      r.report_id,
      r.appointment_id,
      r.patient_id,
      p.name AS patient_name,
      d.name AS doctor_name,
      r.diagnosis,
      r.created_at AS date,
      a.analysis_id,
      c.chat_id
    FROM report r
    JOIN appointment a ON r.appointment_id = a.appointment_id
    JOIN patient p ON r.patient_id = p.patient_id
    JOIN doctor d ON r.medical_syndicate_id_card = d.medical_syndicate_id_card
    LEFT JOIN chat c ON a.appointment_id = c.appointment_id
    WHERE r.medical_syndicate_id_card = $1
    ORDER BY r.created_at DESC
  `, [doctorId]);

  return {
    success: true,
    count: result.rows.length,
    data: result.rows
  };
};

exports.getCaseDetails = async (doctorId, appointmentId) => {
  const result = await pool.query(`
    SELECT
      a.appointment_id,
      a.analysis_id,
      a.patient_id,
      a.date AS appointment_date,
      a.status AS appointment_status,
      p.name AS patient_name,
      p.age,
      p.gender,
      p.email,
      p.phone,
      p.patient_history,
      an.skin_image_upload,
      an.skin_disease_classification,
      an.analysis,
      an.treatment_suggestion,
      an.doctor_recommendation,
      an.created_at AS analysis_date,
      c.chat_id,
      pay.payment_status
    FROM appointment a
    JOIN patient p ON a.patient_id = p.patient_id
    JOIN analysis an ON a.analysis_id = an.analysis_id
    JOIN payment pay ON a.appointment_id = pay.appointment_id
    LEFT JOIN chat c ON a.appointment_id = c.appointment_id
    WHERE a.medical_syndicate_id_card = $1
      AND a.appointment_id = $2
      AND pay.payment_status = 'paid'
  `, [doctorId, appointmentId]);

  if (result.rows.length === 0) {
    const err = new Error("Case not found or not allowed");
    err.status = 404;
    throw err;
  }

  return {
    success: true,
    data: result.rows[0]
  };
};

exports.reviewCase = async (doctorId, data) => {
  const {
    appointment_id,
    diagnosis,
    prescription,
    notes
  } = data;

  const medical_syndicate_id_card = doctorId;

  if (!appointment_id || !diagnosis) {
    const err = new Error("appointment_id and diagnosis are required");
    err.status = 400;
    throw err;
  }

  // Verify this is a paid appointment assigned to this doctor
  const caseResult = await pool.query(`
    SELECT
      a.appointment_id,
      a.analysis_id,
      a.patient_id
    FROM appointment a
    JOIN payment pay ON a.appointment_id = pay.appointment_id
    WHERE a.medical_syndicate_id_card = $1
      AND a.appointment_id = $2
      AND pay.payment_status = 'paid'
  `, [medical_syndicate_id_card, appointment_id]);

  if (caseResult.rows.length === 0) {
    const err = new Error("Case not found, not paid, or not assigned to this doctor");
    err.status = 404;
    throw err;
  }

  const existingReport = await pool.query(
    `SELECT 1 FROM report WHERE appointment_id = $1`,
    [appointment_id]
  );

  if (existingReport.rows.length > 0) {
    const err = new Error("This case has already been reviewed");
    err.status = 409;
    throw err;
  }

  const reportId = uuidv4();
  const caseData = caseResult.rows[0];

  await pool.query(`
    INSERT INTO report
    (report_id, appointment_id, patient_id, medical_syndicate_id_card, diagnosis, prescription, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    reportId,
    appointment_id,
    caseData.patient_id,
    medical_syndicate_id_card,
    diagnosis,
    prescription || null,
    notes || null
  ]);

  // Update appointment status to completed
  await pool.query(
    `UPDATE appointment SET status = 'completed' WHERE appointment_id = $1`,
    [appointment_id]
  );

  return {
    success: true,
    message: "Case reviewed successfully and report created",
    data: {
      report_id: reportId,
      appointment_id,
      patient_id: caseData.patient_id
    }
  };
};