const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

exports.getPendingCases = async (doctorId) => {
  const result = await pool.query(`
    SELECT
      a.appointment_id,
      a.chat_id,
      a.patient_id,
      a.date AS appointment_date,
      a.status AS appointment_status,
      p.name AS patient_name,
      p.age,
      p.gender,
      p.email,
      p.phone,
      c.skin_image_upload,
      c.skin_disease_classification,
      c.analysis,
      c.treatment_suggestion,
      c.doctor_recommendation,
      c.created_at,
      pay.payment_status
    FROM appointment a
    JOIN patient p
      ON a.patient_id = p.patient_id
    JOIN chat_analysis c
      ON a.chat_id = c.chat_id
    JOIN payment pay
      ON a.appointment_id = pay.appointment_id
    LEFT JOIN report r
      ON a.chat_id = r.chat_id
    WHERE a.medical_syndicate_id_card = $1
      AND pay.payment_status = 'paid'
      AND r.chat_id IS NULL
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
      r.chat_id,
      r.patient_id,
      r.patient_name,
      r.doctor_name,
      r.diagnosis,
      r.date
    FROM report r
    WHERE r.medical_syndicate_id_card = $1
    ORDER BY r.date DESC
  `, [doctorId]);

  return {
    success: true,
    count: result.rows.length,
    data: result.rows
  };
};

exports.getCaseDetails = async (doctorId, chatId) => {
  const result = await pool.query(`
    SELECT
      a.appointment_id,
      a.chat_id,
      a.patient_id,
      a.date AS appointment_date,
      a.status AS appointment_status,
      p.name AS patient_name,
      p.age,
      p.gender,
      p.email,
      p.phone,
      p.patient_history,
      c.skin_image_upload,
      c.skin_disease_classification,
      c.analysis,
      c.treatment_suggestion,
      c.doctor_recommendation,
      c.created_at,
      pay.payment_status
    FROM appointment a
    JOIN patient p
      ON a.patient_id = p.patient_id
    JOIN chat_analysis c
      ON a.chat_id = c.chat_id
    JOIN payment pay
      ON a.appointment_id = pay.appointment_id
    WHERE a.medical_syndicate_id_card = $1
      AND a.chat_id = $2
      AND pay.payment_status = 'paid'
  `, [doctorId, chatId]);

  if (result.rows.length === 0) {
    throw new Error("Case not found or not allowed");
  }

  return {
    success: true,
    data: result.rows[0]
  };
};

exports.reviewCase = async (data) => {
  const {
    chat_id,
    doctor_name,
    diagnosis,
    medical_syndicate_id_card
  } = data;

  if (!chat_id || !doctor_name || !diagnosis || !medical_syndicate_id_card) {
    throw new Error("chat_id, doctor_name, diagnosis, and medical_syndicate_id_card are required");
  }

  const caseResult = await pool.query(`
    SELECT
      a.appointment_id,
      a.chat_id,
      a.patient_id,
      p.name AS patient_name
    FROM appointment a
    JOIN patient p
      ON a.patient_id = p.patient_id
    JOIN payment pay
      ON a.appointment_id = pay.appointment_id
    WHERE a.medical_syndicate_id_card = $1
      AND a.chat_id = $2
      AND pay.payment_status = 'paid'
  `, [medical_syndicate_id_card, chat_id]);

  if (caseResult.rows.length === 0) {
    throw new Error("Case not found, not paid, or not assigned to this doctor");
  }

  const existingReport = await pool.query(
    `SELECT * FROM report WHERE chat_id = $1`,
    [chat_id]
  );

  if (existingReport.rows.length > 0) {
    throw new Error("This case has already been reviewed");
  }

  const reportId = uuidv4();
  const caseData = caseResult.rows[0];

  await pool.query(`
    INSERT INTO report
    (report_id, doctor_name, patient_name, patient_id, date, diagnosis, medical_syndicate_id_card, chat_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    reportId,
    doctor_name,
    caseData.patient_name,
    caseData.patient_id,
    new Date(),
    diagnosis,
    medical_syndicate_id_card,
    chat_id
  ]);

  return {
    success: true,
    message: "Case reviewed successfully and report created",
    data: {
      report_id: reportId,
      chat_id,
      patient_id: caseData.patient_id
    }
  };
};