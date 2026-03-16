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
    throw new Error("admin_id and medical_syndicate_id_card are required");
  }

  const adminCheck = await pool.query(
    `SELECT * FROM admin WHERE admin_id = $1`,
    [admin_id]
  );

  if (adminCheck.rows.length === 0) {
    throw new Error("Admin not found");
  }

  const doctorCheck = await pool.query(
    `SELECT * FROM doctor WHERE medical_syndicate_id_card = $1`,
    [medical_syndicate_id_card]
  );

  if (doctorCheck.rows.length === 0) {
    throw new Error("Doctor not found");
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
    throw new Error("medical_syndicate_id_card is required");
  }

  const doctorCheck = await pool.query(
    `SELECT * FROM doctor WHERE medical_syndicate_id_card = $1`,
    [medical_syndicate_id_card]
  );

  if (doctorCheck.rows.length === 0) {
    throw new Error("Doctor not found");
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
      report_id,
      doctor_name,
      patient_name,
      patient_id,
      date,
      diagnosis,
      medical_syndicate_id_card,
      chat_id
    FROM report
    ORDER BY date DESC
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
    `SELECT * FROM admin WHERE admin_id = $1`,
    [adminId]
  );

  if (adminCheck.rows.length === 0) {
    throw new Error("Admin not found");
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