const pool = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const emailService = require("./emailService");

const TABLE_MAP = { patient: "patient", doctor: "doctor", admin: "admin" };

/**
 * Check if an email is already registered in ANY role table.
 * Returns the role name ("patient", "doctor", "admin") if found, or null.
 */
async function isEmailTakenGlobally(email) {
  const cleanEmail = String(email).trim().toLowerCase();
  const result = await pool.query(
    `SELECT 'patient' AS role FROM patient WHERE LOWER(email) = $1
     UNION ALL
     SELECT 'doctor' AS role FROM doctor WHERE LOWER(email) = $1
     UNION ALL
     SELECT 'admin' AS role FROM admin WHERE LOWER(email) = $1
     LIMIT 1`,
    [cleanEmail]
  );
  return result.rows.length > 0 ? result.rows[0].role : null;
}

/**
 * Check if a phone number is already registered in ANY role table (patient, doctor).
 * Returns the role name ("patient", "doctor") if found, or null.
 * Handles normalization and alternative representations (e.g. prefix 0 vs +20).
 */
async function isPhoneTakenGlobally(phone, excludeId = null, excludeRole = null) {
  if (!phone) return null;
  const cleanPhone = String(phone).trim();
  let phoneAlternative = cleanPhone;
  if (cleanPhone.startsWith("+20")) {
    phoneAlternative = "0" + cleanPhone.slice(3);
  } else if (cleanPhone.startsWith("0")) {
    phoneAlternative = "+20" + cleanPhone.slice(1);
  }

  const result = await pool.query(
    `SELECT 'patient' AS role, patient_id::TEXT AS id FROM patient WHERE phone IN ($1, $2)
     UNION ALL
     SELECT 'doctor' AS role, medical_syndicate_id_card::TEXT AS id FROM doctor WHERE phone IN ($1, $2)`,
    [cleanPhone, phoneAlternative]
  );

  for (const row of result.rows) {
    if (excludeId && excludeRole && row.role === excludeRole && String(row.id) === String(excludeId)) {
      continue;
    }
    return row.role;
  }
  return null;
}

function getBirthDateFromNationalId(nationalId = "") {
  const cleanId = String(nationalId).trim();
  if (!/^[23][0-9]{13}$/.test(cleanId)) return null;
  const centuryDigit = Number(cleanId[0]);
  const yearPart = cleanId.slice(1, 3);
  const monthPart = cleanId.slice(3, 5);
  const dayPart = cleanId.slice(5, 7);
  
  const centuryPrefix = centuryDigit === 2 ? "19" : "20";
  const birthYear = Number(centuryPrefix + yearPart);
  const birthMonth = Number(monthPart) - 1; // 0-indexed month
  const birthDay = Number(dayPart);
  
  const birthDate = new Date(birthYear, birthMonth, birthDay);
  if (
    birthDate.getFullYear() !== birthYear ||
    birthDate.getMonth() !== birthMonth ||
    birthDate.getDate() !== birthDay
  ) {
    return null;
  }
  return birthDate;
}

function calculateAge(birthDate) {
  if (!birthDate) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

exports.registerPatient = async (data) => {
  const { name, phone, gender, email, password, age, address } = data;

  if (!name || !email || !password || age === undefined || age === null) {
    const err = new Error("name, email, password, and age are required");
    err.status = 400;
    throw err;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    const err = new Error("Invalid email format");
    err.status = 400;
    throw err;
  }

  // Name length validation (matching frontend)
  const cleanName = String(name).trim();
  if (cleanName.length < 2 || cleanName.length > 80) {
    const err = new Error("Name must be between 2 and 80 characters long.");
    err.status = 400;
    throw err;
  }

  // Password length validation (matching frontend)
  if (String(password).length < 6) {
    const err = new Error("Password must be at least 6 characters long.");
    err.status = 400;
    throw err;
  }

  if (phone) {
    const cleanPhone = String(phone).trim();
    if (!/^(\+20|0)(10|11|12|15)[0-9]{8}$/.test(cleanPhone)) {
      const err = new Error("Invalid Egyptian mobile number. Must be a valid 010, 011, 012, or 015 number (11 digits or starting with +20).");
      err.status = 400;
      throw err;
    }

    const phoneTakenRole = await isPhoneTakenGlobally(cleanPhone);
    if (phoneTakenRole) {
      const err = new Error(
        phoneTakenRole === "patient"
          ? "Phone number is already registered"
          : `This phone number is already registered as a ${phoneTakenRole}. Each phone number can only be used for one account type.`
      );
      err.status = 409;
      throw err;
    }
  }

  const numericAge = Number(age);
  if (isNaN(numericAge) || numericAge < 13 || numericAge > 100 || !Number.isInteger(numericAge)) {
    const err = new Error("Invalid age. Must be an integer between 13 and 100.");
    err.status = 400;
    throw err;
  }

  const existingRole = await isEmailTakenGlobally(cleanEmail);
  if (existingRole) {
    const err = new Error(
      existingRole === "patient"
        ? "Email already exists"
        : `This email is already registered as a ${existingRole}. Each email can only be used for one account type.`
    );
    err.status = 409;
    throw err;
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
    [patientId, name, phone || null, gender || null, cleanEmail, hashedPassword, numericAge, address || null, now, now]
  );

  return {
    success: true,
    message: "Patient registered successfully",
    data: {
      patient_id: patientId,
      email: cleanEmail
    }
  };
};

exports.registerDoctor = async (data, file) => {
  const {
    name,
    phone,
    gender,
    email,
    national_id,
    password,
    year_of_experience,
    specialization,
    clinic_address,
    admin_id,
    consultation_fee,
    age
  } = data;

  if (
    !name ||
    !email ||
    !password ||
    !specialization ||
    age === undefined ||
    age === null
  ) {
    const err = new Error("name, email, password, specialization, and age are required");
    err.status = 400;
    throw err;
  }

  // 1. Email validation & normalization
  const cleanEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    const err = new Error("Invalid email format");
    err.status = 400;
    throw err;
  }

  // Name length validation (matching frontend)
  const cleanName = String(name).trim();
  if (cleanName.length < 2 || cleanName.length > 80) {
    const err = new Error("Name must be between 2 and 80 characters long.");
    err.status = 400;
    throw err;
  }

  // Password length validation (matching frontend)
  if (String(password).length < 6) {
    const err = new Error("Password must be at least 6 characters long.");
    err.status = 400;
    throw err;
  }

  // 2. Phone number validation (Egyptian mobile formats)
  if (!phone || !/^(\+20|0)(10|11|12|15)[0-9]{8}$/.test(String(phone).trim())) {
    const err = new Error("Invalid Egyptian mobile number. Must be a valid 010, 011, 012, or 015 number (11 digits or starting with +20).");
    err.status = 400;
    throw err;
  }

  const cleanPhone = String(phone).trim();
  const phoneTakenRole = await isPhoneTakenGlobally(cleanPhone);
  if (phoneTakenRole) {
    const err = new Error(
      phoneTakenRole === "doctor"
        ? "Phone number is already registered"
        : `This phone number is already registered as a ${phoneTakenRole}. Each phone number can only be used for one account type.`
    );
    err.status = 409;
    throw err;
  }

  // 3. National ID validation (14 digits, digits only, starting with 2 or 3)
  const cleanNationalId = String(national_id).trim();
  if (!/^[23][0-9]{13}$/.test(cleanNationalId)) {
    const err = new Error("Invalid National ID. Must be exactly 14 digits and start with 2 or 3.");
    err.status = 400;
    throw err;
  }

  const birthDate = getBirthDateFromNationalId(cleanNationalId);
  if (!birthDate) {
    const err = new Error("National ID contains an invalid date of birth.");
    err.status = 400;
    throw err;
  }

  // Calculate age from National ID for consistency check
  const calculatedAge = calculateAge(birthDate);

  // 4. Age validation
  const numericAge = Number(age);
  if (isNaN(numericAge) || numericAge < 23 || numericAge > 75 || !Number.isInteger(numericAge)) {
    const err = new Error("Invalid age. Must be an integer between 23 and 75.");
    err.status = 400;
    throw err;
  }

  // Consistency check: Entered age must match National ID age
  if (numericAge !== calculatedAge) {
    const err = new Error(`Entered age (${numericAge}) does not match the age calculated from National ID (${calculatedAge}).`);
    err.status = 400;
    throw err;
  }

  // Consistency check: Entered gender must match National ID gender if specified as male/female
  if (gender) {
    const cleanGender = String(gender).trim().toLowerCase();
    if (cleanGender === "male" || cleanGender === "female") {
      const genderDigit = Number(cleanNationalId[12]);
      const derivedGender = (genderDigit % 2 === 0) ? "female" : "male";
      if (cleanGender !== derivedGender) {
        const err = new Error(`Entered gender (${gender}) does not match the gender derived from National ID (${derivedGender}).`);
        err.status = 400;
        throw err;
      }
    }
  }

  // 5. Experience Years Validation (0 to 45 years)
  const exp = Number(year_of_experience);
  if (year_of_experience === undefined || year_of_experience === null || isNaN(exp) || exp < 0 || exp > 45 || !Number.isInteger(exp)) {
    const err = new Error("Invalid Experience years. Must be an integer between 0 and 45.");
    err.status = 400;
    throw err;
  }

  // Experience age consistency check: exp <= age - 23
  if (exp > numericAge - 23) {
    const err = new Error(`Years of experience (${exp}) is unrealistic for age (${numericAge}). Maximum possible experience is ${numericAge - 23} years.`);
    err.status = 400;
    throw err;
  }

  // 6. Consultation Fee Validation (50 to 3000 EGP)
  const fee = Number(consultation_fee);
  if (consultation_fee === undefined || consultation_fee === null || isNaN(fee) || fee < 50 || fee > 3000 || !Number.isInteger(fee)) {
    const err = new Error("Invalid Consultation fee. Must be an integer between 50 and 3000 EGP.");
    err.status = 400;
    throw err;
  }

  if (!file) {
    const err = new Error("Syndicate card image is required");
    err.status = 400;
    throw err;
  }

  const existingRole = await isEmailTakenGlobally(cleanEmail);
  if (existingRole) {
    const err = new Error(
      existingRole === "doctor"
        ? "Doctor already exists with this email"
        : `This email is already registered as a ${existingRole}. Each email can only be used for one account type.`
    );
    err.status = 409;
    throw err;
  }

  // Check if a doctor with this National ID is already registered
  const existingNationalId = await pool.query(
    "SELECT 1 FROM doctor WHERE national_id = $1",
    [cleanNationalId]
  );
  if (existingNationalId.rows.length > 0) {
    const err = new Error("A doctor with this National ID is already registered in the system.");
    err.status = 409;
    throw err;
  }


  // Generate highly unique timestamp-based doctor identifier (with a random suffix to completely prevent collisions)
  let doctorId = "";
  let isUnique = false;
  while (!isUnique) {
    doctorId = `DOC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const existingId = await pool.query(
      `SELECT 1 FROM doctor WHERE medical_syndicate_id_card = $1`,
      [doctorId]
    );
    if (existingId.rows.length === 0) {
      isUnique = true;
    }
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
      syndicate_card_image,
      consultation_fee,
      age
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    `,
    [
      doctorId,
      name,
      phone || null,
      gender || null,
      cleanEmail,
      cleanNationalId,
      hashedPassword,
      null,
      exp,
      specialization,
      clinic_address || null,
      admin_id || null,
      "pending",
      syndicateCardImage,
      fee,
      numericAge
    ]
  );

  const newDoctorQuery = await pool.query(
    `SELECT medical_syndicate_id_card, name, phone, gender, email, national_id, specialization, year_of_experience, clinic_address, approval_status, syndicate_card_image, consultation_fee, age
     FROM doctor
     WHERE medical_syndicate_id_card = $1`,
    [doctorId]
  );

  return {
    success: true,
    message: "Doctor registered successfully",
    data: newDoctorQuery.rows[0]
  };
};

exports.registerAdmin = async (data) => {
  const { email, password, invite_code } = data;

  if (!email || !password || !invite_code) {
    const err = new Error("email, password, and invite_code are required");
    err.status = 400;
    throw err;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    const err = new Error("Invalid email format");
    err.status = 400;
    throw err;
  }

  const existingRole = await isEmailTakenGlobally(cleanEmail);
  if (existingRole) {
    const err = new Error(
      existingRole === "admin"
        ? "Admin already exists"
        : `This email is already registered as a ${existingRole}. Each email can only be used for one account type.`
    );
    err.status = 409;
    throw err;
  }

  const inviteResult = await pool.query(
    `
    SELECT * FROM admin_invite_code
    WHERE invite_code = $1
    `,
    [invite_code]
  );

  if (inviteResult.rows.length === 0) {
    const err = new Error("Invalid invite code");
    err.status = 400;
    throw err;
  }

  const invite = inviteResult.rows[0];

  if (invite.is_used) {
    const err = new Error("Invite code already used");
    err.status = 400;
    throw err;
  }

  const isExpired = new Date() - new Date(invite.created_at) > 15 * 60 * 1000;
  if (isExpired) {
    const err = new Error("Invite code has expired");
    err.status = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const adminId = uuidv4();

  await pool.query(
    `
    INSERT INTO admin
    (admin_id, email, password, admin_role)
    VALUES ($1, $2, $3, $4)
    `,
    [adminId, cleanEmail, hashedPassword, "admin"]
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
      email: cleanEmail,
      admin_role: "admin"
    }
  };
};

exports.login = async (data) => {
  const { role, email, password } = data;

  if (!role || !email || !password) {
    const err = new Error("role, email, and password are required");
    err.status = 400;
    throw err;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    const err = new Error("Invalid email format");
    err.status = 400;
    throw err;
  }

  let query = "";
  let idField = "";

  if (role === "patient") {
    query = `SELECT * FROM patient WHERE LOWER(email) = $1`;
    idField = "patient_id";
  } else if (role === "doctor") {
    query = `SELECT * FROM doctor WHERE LOWER(email) = $1`;
    idField = "medical_syndicate_id_card";
  } else if (role === "admin") {
    query = `SELECT * FROM admin WHERE LOWER(email) = $1`;
    idField = "admin_id";
  } else {
    const err = new Error("Invalid role");
    err.status = 400;
    throw err;
  }

  const result = await pool.query(query, [cleanEmail]);

  if (result.rows.length === 0) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  const user = result.rows[0];

  if (role === "doctor" && user.approval_status !== "approved") {
    const err = new Error("Doctor account is not approved yet");
    err.status = 403;
    throw err;
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
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
        patient_history,
        scan_image,
        created_at,
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
        year_of_experience,
        rate,
        consultation_fee,
        national_id,
        syndicate_card_image,
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
        admin_role,
        'admin' AS role
      FROM admin
      WHERE admin_id = $1
    `;
  } else {
    const err = new Error("Invalid role");
    err.status = 400;
    throw err;
  }

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  return {
    success: true,
    data: result.rows[0]
  };
};

/**
 * Search all role tables and return the role for a given email.
 */
async function detectRoleByEmail(email) {
  const cleanEmail = String(email).trim().toLowerCase();
  for (const role of Object.keys(TABLE_MAP)) {
    const result = await pool.query(
      `SELECT 1 FROM ${TABLE_MAP[role]} WHERE LOWER(email) = $1`,
      [cleanEmail]
    );
    if (result.rows.length > 0) return role;
  }
  return null;
}

exports.forgotPassword = async (data) => {
  const { email } = data;

  if (!email) {
    const err = new Error("email is required");
    err.status = 400;
    throw err;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    const err = new Error("Invalid email format");
    err.status = 400;
    throw err;
  }

  const role = await detectRoleByEmail(cleanEmail);

  if (!role) {
    const err = new Error("No account found with this email");
    err.status = 404;
    throw err;
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await pool.query(
    `DELETE FROM password_reset WHERE LOWER(email) = $1 AND role = $2`,
    [cleanEmail, role]
  );

  await pool.query(
    `
    INSERT INTO password_reset (email, role, reset_code, expires_at)
    VALUES ($1, $2, $3, $4)
    `,
    [cleanEmail, role, otpCode, expiresAt]
  );

  await emailService.sendResetPasswordOtpEmail({
    to: cleanEmail,
    otpCode
  });

  return {
    success: true,
    message: "Password reset code sent successfully"
  };
};

exports.resetPassword = async (data) => {
  const { email, otp, new_password } = data;

  if (!email || !otp || !new_password) {
    const err = new Error("email, otp, and new_password are required");
    err.status = 400;
    throw err;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    const err = new Error("Invalid email format");
    err.status = 400;
    throw err;
  }

  const codeResult = await pool.query(
    `
    SELECT * FROM password_reset
    WHERE LOWER(email) = $1
      AND reset_code = $2
      AND expires_at > NOW()
    `,
    [cleanEmail, otp]
  );

  if (codeResult.rows.length === 0) {
    const err = new Error("Invalid or expired OTP");
    err.status = 400;
    throw err;
  }

  const role = codeResult.rows[0].role;
  const tableName = TABLE_MAP[role];

  const hashedPassword = await bcrypt.hash(new_password, 10);

  await pool.query(
    `UPDATE ${tableName} SET password = $1 WHERE LOWER(email) = $2`,
    [hashedPassword, cleanEmail]
  );

  await pool.query(
    `DELETE FROM password_reset WHERE LOWER(email) = $1`,
    [cleanEmail]
  );

  return {
    success: true,
    message: "Password has been reset successfully"
  };
};