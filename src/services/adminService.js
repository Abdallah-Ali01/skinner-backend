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

exports.approveDoctor = async (adminId, data) => {
  const { medical_syndicate_id_card } = data;

  if (!medical_syndicate_id_card) {
    const err = new Error("medical_syndicate_id_card is required");
    err.status = 400;
    throw err;
  }

  const adminCheck = await pool.query(
    `SELECT 1 FROM admin WHERE admin_id = $1`,
    [adminId]
  );

  if (adminCheck.rows.length === 0) {
    const err = new Error("Admin not found");
    err.status = 404;
    throw err;
  }

  const doctorCheck = await pool.query(
    `SELECT approval_status FROM doctor WHERE medical_syndicate_id_card = $1`,
    [medical_syndicate_id_card]
  );

  if (doctorCheck.rows.length === 0) {
    const err = new Error("Doctor not found");
    err.status = 404;
    throw err;
  }

  if (doctorCheck.rows[0].approval_status !== 'pending') {
    const err = new Error(`Doctor is already ${doctorCheck.rows[0].approval_status}`);
    err.status = 409;
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
    [adminId, medical_syndicate_id_card]
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
    `SELECT approval_status FROM doctor WHERE medical_syndicate_id_card = $1`,
    [medical_syndicate_id_card]
  );

  if (doctorCheck.rows.length === 0) {
    const err = new Error("Doctor not found");
    err.status = 404;
    throw err;
  }

  if (doctorCheck.rows[0].approval_status !== 'pending') {
    const err = new Error(`Doctor is already ${doctorCheck.rows[0].approval_status}`);
    err.status = 409;
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

exports.getStats = async () => {
  const patientsCount = await pool.query("SELECT COUNT(*) AS count FROM patient");
  const approvedDoctorsCount = await pool.query("SELECT COUNT(*) AS count FROM doctor WHERE approval_status = 'approved'");
  const pendingDoctorsCount = await pool.query("SELECT COUNT(*) AS count FROM doctor WHERE approval_status = 'pending'");
  const analysesCount = await pool.query("SELECT COUNT(*) AS count FROM analysis");

  const totalPatients = parseInt(patientsCount.rows[0].count, 10);
  const activeDoctors = parseInt(approvedDoctorsCount.rows[0].count, 10);
  const pendingApprovals = parseInt(pendingDoctorsCount.rows[0].count, 10);
  const totalAnalyses = parseInt(analysesCount.rows[0].count, 10);

  return {
    success: true,
    data: {
      totalUsers: totalPatients + activeDoctors + pendingApprovals,
      activeDoctors,
      pendingApprovals,
      totalAnalyses
    }
  };
};

exports.getAnalyses = async () => {
  const result = await pool.query(
    `
    SELECT
      a.analysis_id,
      a.patient_id,
      a.analysis,
      a.skin_image_upload,
      a.treatment_suggestion,
      a.skin_disease_classification,
      a.doctor_recommendation,
      a.created_at,
      p.name AS patient_name,
      p.email AS patient_email
    FROM analysis a
    JOIN patient p ON a.patient_id = p.patient_id
    ORDER BY a.created_at DESC
    `
  );

  return {
    success: true,
    count: result.rows.length,
    data: result.rows
  };
};

exports.getUsers = async () => {
  const patientsRes = await pool.query(
    `
    SELECT
      patient_id AS id,
      name,
      phone,
      gender,
      email,
      age,
      address,
      created_at
    FROM patient
    ORDER BY created_at DESC
    `
  );

  const doctorsRes = await pool.query(
    `
    SELECT
      medical_syndicate_id_card AS id,
      name,
      phone,
      gender,
      email,
      specialization,
      year_of_experience,
      clinic_address,
      approval_status
    FROM doctor
    ORDER BY name ASC
    `
  );

  const patients = patientsRes.rows.map(r => ({ ...r, role: "patient" }));
  const doctors = doctorsRes.rows.map(r => ({ ...r, role: "doctor" }));

  return {
    success: true,
    data: {
      patients,
      doctors
    }
  };
};