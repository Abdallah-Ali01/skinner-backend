const pool = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const crypto = require("crypto");
const emailService = require("./emailService");

exports.registerPatient = async (data) => {
  const { name, phone, gender, email, password, age, address } = data;

  const existing = await pool.query(
    `SELECT * FROM patient WHERE email = $1`,
    [email]
  );

  if (existing.rows.length > 0) {
    throw new Error("Email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const patientId = uuidv4();
  const now = new Date();

  await pool.query(
    `
    INSERT INTO patient
    (patient_id, name, phone, gender, email, password, age, address, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `,
    [patientId, name, phone, gender, email, hashedPassword, age, address, now, now]
  );

  return {
    success: true,
    message: "Patient registered successfully",
    data: {
      patient_id: patientId,
      email
    }
  };
};

exports.registerDoctor = async (data, file) => {
  const {
    medical_syndicate_id_card,
    name,
    phone,
    gender,
    email,
    national_id,
    password,
    year_of_experience,
    specialization,
    clinic_address,
    admin_id
  } = data;

  if (
    !medical_syndicate_id_card ||
    !name ||
    !email ||
    !password ||
    !specialization
  ) {
    throw new Error("medical_syndicate_id_card, name, email, password, and specialization are required");
  }

  if (!file) {
    throw new Error("Syndicate card image is required");
  }

  const existing = await pool.query(
    `SELECT * FROM doctor WHERE email = $1 OR medical_syndicate_id_card = $2`,
    [email, medical_syndicate_id_card]
  );

  if (existing.rows.length > 0) {
    throw new Error("Doctor already exists with this email or syndicate ID");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const syndicateCardImage = `/uploads/doctor-cards/${file.filename}`;

  await pool.query(
    `
    INSERT INTO doctor
    (
      medical_syndicate_id_card,
      name,
      phone,
      gender,
      email,
      national_id,
      password,
      rate,
      year_of_experience,
      specialization,
      clinic_address,
      admin_id,
      approval_status,
      syndicate_card_image
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    `,
    [
      medical_syndicate_id_card,
      name,
      phone || null,
      gender || null,
      email,
      national_id || null,
      hashedPassword,
      null,
      year_of_experience || null,
      specialization,
      clinic_address || null,
      admin_id || null,
      "pending",
      syndicateCardImage
    ]
  );

  return {
    success: true,
    message: "Doctor registered successfully",
    data: {
      medical_syndicate_id_card,
      email,
      approval_status: "pending",
      syndicate_card_image: syndicateCardImage
    }
  };
};

exports.registerAdmin = async (data) => {
  const { email, password, invite_code } = data;

  if (!email || !password || !invite_code) {
    throw new Error("email, password, and invite_code are required");
  }

  const existing = await pool.query(
    `SELECT * FROM admin WHERE email = $1`,
    [email]
  );

  if (existing.rows.length > 0) {
    throw new Error("Admin already exists");
  }

  const inviteResult = await pool.query(
    `
    SELECT * FROM admin_invite_code
    WHERE invite_code = $1
    `,
    [invite_code]
  );

  if (inviteResult.rows.length === 0) {
    throw new Error("Invalid invite code");
  }

  const invite = inviteResult.rows[0];

  if (invite.is_used) {
    throw new Error("Invite code already used");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const adminId = uuidv4();

  await pool.query(
    `
    INSERT INTO admin
    (admin_id, email, password, admin_role)
    VALUES ($1, $2, $3, $4)
    `,
    [adminId, email, hashedPassword, "admin"]
  );

  await pool.query(
    `
    UPDATE admin_invite_code
    SET is_used = TRUE,
        used_by_admin_id = $1
    WHERE invite_code = $2
    `,
    [adminId, invite_code]
  );

  return {
    success: true,
    message: "Admin registered successfully",
    data: {
      admin_id: adminId,
      email,
      admin_role: "admin"
    }
  };
};

exports.login = async (data) => {
  const { role, email, password } = data;

  let query = "";
  let idField = "";

  if (role === "patient") {
    query = `SELECT * FROM patient WHERE email = $1`;
    idField = "patient_id";
  } else if (role === "doctor") {
    query = `SELECT * FROM doctor WHERE email = $1`;
    idField = "medical_syndicate_id_card";
  } else if (role === "admin") {
    query = `SELECT * FROM admin WHERE email = $1`;
    idField = "admin_id";
  } else {
    throw new Error("Invalid role");
  }

  const result = await pool.query(query, [email]);

  if (result.rows.length === 0) {
    throw new Error("Invalid email or password");
  }

  const user = result.rows[0];
    if (role === "doctor" && user.approval_status !== "approved") {
    throw new Error("Doctor account is not approved yet");
  }
  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign(
  {
    id: user[idField],
    email: user.email,
    role,
    admin_role: user.admin_role || null
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

  return {
    success: true,
    token,
    role,
    data: {
      id: user[idField],
      email: user.email
    }
  };
};

exports.getMe = async (userData) => {
  const { id, role } = userData;

  let query = "";
  let values = [id];

  if (role === "patient") {
    query = `
      SELECT
        patient_id AS id,
        name,
        email,
        phone,
        gender,
        age,
        address,
        'patient' AS role
      FROM patient
      WHERE patient_id = $1
    `;
  } else if (role === "doctor") {
    query = `
      SELECT
        medical_syndicate_id_card AS id,
        name,
        email,
        phone,
        gender,
        specialization,
        clinic_address,
        approval_status,
        'doctor' AS role
      FROM doctor
      WHERE medical_syndicate_id_card = $1
    `;
  } else if (role === "admin") {
    query = `
      SELECT
        admin_id AS id,
        email,
        'admin' AS role
      FROM admin
      WHERE admin_id = $1
    `;
  } else {
    throw new Error("Invalid role");
  }

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    throw new Error("User not found");
  }

  return {
    success: true,
    data: result.rows[0]
  };
};



exports.forgotPassword = async (data) => {
  const { email, role } = data;

  if (!email || !role) {
    throw new Error("email and role are required");
  }

  let tableName = "";

  if (role === "patient") {
    tableName = "patient";
  } else if (role === "doctor") {
    tableName = "doctor";
  } else if (role === "admin") {
    tableName = "admin";
  } else {
    throw new Error("Invalid role");
  }

  const userCheck = await pool.query(
    `SELECT * FROM ${tableName} WHERE email = $1`,
    [email]
  );

  if (userCheck.rows.length === 0) {
    throw new Error("No account found with this email");
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await pool.query(
    `DELETE FROM password_reset WHERE email = $1 AND role = $2`,
    [email, role]
  );

  await pool.query(
    `
    INSERT INTO password_reset (email, role, reset_code, expires_at)
    VALUES ($1, $2, $3, $4)
    `,
    [email, role, otpCode, expiresAt]
  );

  await emailService.sendResetPasswordOtpEmail({
    to: email,
    otpCode
  });

  return {
    success: true,
    message: "Password reset code sent successfully"
  };
};

exports.resetPassword = async (data) => {
  const { email, role, otp, new_password } = data;

  if (!email || !role || !otp || !new_password) {
    throw new Error("email, role, otp, and new_password are required");
  }

  const codeResult = await pool.query(
    `
    SELECT * FROM password_reset
    WHERE email = $1
      AND role = $2
      AND reset_code = $3
      AND expires_at > NOW()
    `,
    [email, role, otp]
  );

  if (codeResult.rows.length === 0) {
    throw new Error("Invalid or expired OTP");
  }

  let tableName = "";

  if (role === "patient") {
    tableName = "patient";
  } else if (role === "doctor") {
    tableName = "doctor";
  } else if (role === "admin") {
    tableName = "admin";
  } else {
    throw new Error("Invalid role");
  }

  const hashedPassword = await bcrypt.hash(new_password, 10);

  await pool.query(
    `UPDATE ${tableName} SET password = $1 WHERE email = $2`,
    [hashedPassword, email]
  );

  await pool.query(
    `DELETE FROM password_reset WHERE email = $1 AND role = $2`,
    [email, role]
  );

  return {
    success: true,
    message: "Password has been reset successfully"
  };
};