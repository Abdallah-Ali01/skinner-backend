const pool = require("../config/database");
const crypto = require("crypto");

exports.getPendingDoctors = async () => {
  const result = await pool.query(
    `
    SELECT
      medical_syndicate_id_card,
      name,
      phone,
      gender,
      email,
      national_id,
      rate,
      year_of_experience,
      specialization,
      clinic_address,
      approval_status,
      syndicate_card_image
    FROM doctor
    WHERE approval_status = 'pending'
    ORDER BY name ASC
    `
  );

  return {
    success: true,
    count: result.rows.length,
    data: result.rows
  };
};

exports.approveDoctor = async (data) => {
  const { admin_id, medical_syndicate_id_card } = data;

  if (!admin_id || !medical_syndicate_id_card) {
    const err = new Error("admin_id and medical_syndicate_id_card are required");
    err.status = 400;
    throw err;
  }

  const adminCheck = await pool.query(
    `SELECT 1 FROM admin WHERE admin_id = $1`,
    [admin_id]
  );

  if (adminCheck.rows.length === 0) {
    const err = new Error("Admin not found");
    err.status = 404;
    throw err;
  }

  const doctorCheck = await pool.query(
    `SELECT 1 FROM doctor WHERE medical_syndicate_id_card = $1`,
    [medical_syndicate_id_card]
  );

  if (doctorCheck.rows.length === 0) {
    const err = new Error("Doctor not found");
    err.status = 404;
    throw err;
  }

  await pool.query(
    `
    UPDATE doctor
    SET
      admin_id = $1,
      approval_status = 'approved'
    WHERE medical_syndicate_id_card = $2
    `,
    [admin_id, medical_syndicate_id_card]
  );

  return {
    success: true,
    message: "Doctor approved successfully"
  };
};

exports.rejectDoctor = async (data) => {
  const { medical_syndicate_id_card } = data;

  if (!medical_syndicate_id_card) {
    const err = new Error("medical_syndicate_id_card is required");
    err.status = 400;
    throw err;
  }

  const doctorCheck = await pool.query(
    `SELECT 1 FROM doctor WHERE medical_syndicate_id_card = $1`,
    [medical_syndicate_id_card]
  );

  if (doctorCheck.rows.length === 0) {
    const err = new Error("Doctor not found");
    err.status = 404;
    throw err;
  }

  await pool.query(
    `
    UPDATE doctor
    SET approval_status = 'rejected'
    WHERE medical_syndicate_id_card = $1
    `,
    [medical_syndicate_id_card]
  );

  return {
    success: true,
    message: "Doctor rejected"
  };
};

exports.getReports = async () => {
  const result = await pool.query(
    `
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
      p.name AS patient_name,
      a.analysis_id,
      ch.chat_id
    FROM report r
    JOIN appointment a ON r.appointment_id = a.appointment_id
    JOIN doctor d ON r.medical_syndicate_id_card = d.medical_syndicate_id_card
    JOIN patient p ON r.patient_id = p.patient_id
    LEFT JOIN chat ch ON a.appointment_id = ch.appointment_id
    ORDER BY r.created_at DESC
    `
  );

  return {
    success: true,
    count: result.rows.length,
    data: result.rows
  };
};

exports.generateAdminCode = async (adminId) => {
  const adminCheck = await pool.query(
    `SELECT 1 FROM admin WHERE admin_id = $1`,
    [adminId]
  );

  if (adminCheck.rows.length === 0) {
    const err = new Error("Admin not found");
    err.status = 404;
    throw err;
  }

  const inviteCode = "ADM-" + crypto.randomBytes(4).toString("hex").toUpperCase();

  await pool.query(
    `
    INSERT INTO admin_invite_code (invite_code, created_by_admin_id)
    VALUES ($1, $2)
    `,
    [inviteCode, adminId]
  );

  return {
    success: true,
    message: "Admin invite code generated successfully",
    data: {
      invite_code: inviteCode
    }
  };
};