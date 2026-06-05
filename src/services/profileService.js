const pool = require("../config/database");

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

/**
 * Check if an email is already registered in ANY role table (patient, doctor, admin).
 * Returns the role name ("patient", "doctor", "admin") if found, or null.
 * Excludes the given ID and Role from checks.
 */
async function isEmailTakenGlobally(email, excludeId = null, excludeRole = null) {
  if (!email) return null;
  const cleanEmail = String(email).trim().toLowerCase();

  const result = await pool.query(
    `SELECT 'patient' AS role, patient_id::TEXT AS id FROM patient WHERE LOWER(email) = $1
     UNION ALL
     SELECT 'doctor' AS role, medical_syndicate_id_card::TEXT AS id FROM doctor WHERE LOWER(email) = $1
     UNION ALL
     SELECT 'admin' AS role, admin_id::TEXT AS id FROM admin WHERE LOWER(email) = $1`,
    [cleanEmail]
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

/**
 * Update patient profile (only allowed fields).
 */
exports.updatePatientProfile = async (patientId, data) => {
  if (data.email !== undefined) {
    const cleanEmail = String(data.email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      const err = new Error("Invalid email format");
      err.status = 400;
      throw err;
    }

    const emailTakenRole = await isEmailTakenGlobally(cleanEmail, patientId, "patient");
    if (emailTakenRole) {
      const err = new Error(
        emailTakenRole === "patient"
          ? "Email already exists"
          : `This email is already registered as a ${emailTakenRole}. Each email can only be used for one account type.`
      );
      err.status = 409;
      throw err;
    }
  }

  if (data.phone !== undefined) {
    if (data.phone) {
      const cleanPhone = String(data.phone).trim();
      if (!/^(\+20|0)(10|11|12|15)[0-9]{8}$/.test(cleanPhone)) {
        const err = new Error("Invalid Egyptian mobile number. Must be a valid 010, 011, 012, or 015 number (11 digits or starting with +20).");
        err.status = 400;
        throw err;
      }

      const phoneTakenRole = await isPhoneTakenGlobally(cleanPhone, patientId, "patient");
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
  }

  if (data.age !== undefined) {
    const numericAge = Number(data.age);
    if (isNaN(numericAge) || numericAge < 13 || numericAge > 100 || !Number.isInteger(numericAge)) {
      const err = new Error("Invalid age. Must be an integer between 13 and 100.");
      err.status = 400;
      throw err;
    }
  }

  const allowedFields = ["name", "email", "phone", "gender", "age", "address", "patient_history"];
  const updates = [];
  const values = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIndex}`);
      if (field === "email") {
        values.push(String(data[field]).trim().toLowerCase());
      } else {
        values.push(data[field]);
      }
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    const err = new Error("No valid fields to update");
    err.status = 400;
    throw err;
  }

  // Always set updated_at
  updates.push(`updated_at = $${paramIndex}`);
  values.push(new Date());
  paramIndex++;

  values.push(patientId);

  await pool.query(
    `UPDATE patient SET ${updates.join(", ")} WHERE patient_id = $${paramIndex}`,
    values
  );

  // Return updated profile
  const result = await pool.query(
    `SELECT
      patient_id AS id,
      name, email, phone, gender, age,
      address, patient_history, scan_image,
      created_at, updated_at,
      'patient' AS role
    FROM patient
    WHERE patient_id = $1`,
    [patientId]
  );

  return {
    success: true,
    message: "Profile updated successfully",
    data: result.rows[0]
  };
};

/**
 * Update doctor profile (only allowed fields).
 */
exports.updateDoctorProfile = async (doctorId, data) => {
  if (data.email !== undefined) {
    const cleanEmail = String(data.email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      const err = new Error("Invalid email format");
      err.status = 400;
      throw err;
    }

    const emailTakenRole = await isEmailTakenGlobally(cleanEmail, doctorId, "doctor");
    if (emailTakenRole) {
      const err = new Error(
        emailTakenRole === "doctor"
          ? "Doctor already exists with this email"
          : `This email is already registered as a ${emailTakenRole}. Each email can only be used for one account type.`
      );
      err.status = 409;
      throw err;
    }
  }

  if (data.phone !== undefined) {
    if (data.phone) {
      const cleanPhone = String(data.phone).trim();
      if (!/^(\+20|0)(10|11|12|15)[0-9]{8}$/.test(cleanPhone)) {
        const err = new Error("Invalid Egyptian mobile number. Must be a valid 010, 011, 012, or 015 number (11 digits or starting with +20).");
        err.status = 400;
        throw err;
      }

      const phoneTakenRole = await isPhoneTakenGlobally(cleanPhone, doctorId, "doctor");
      if (phoneTakenRole) {
        const err = new Error(
          phoneTakenRole === "doctor"
            ? "Phone number is already registered"
            : `This phone number is already registered as a ${phoneTakenRole}. Each phone number can only be used for one account type.`
        );
        err.status = 409;
        throw err;
      }
    }
  }

  let currentAge = null;
  let currentExp = null;
  let currentNationalId = null;

  if (data.age !== undefined || data.year_of_experience !== undefined || data.gender !== undefined) {
    const docRes = await pool.query(
      "SELECT age, year_of_experience, national_id FROM doctor WHERE medical_syndicate_id_card = $1",
      [doctorId]
    );
    if (docRes.rows.length > 0) {
      currentAge = docRes.rows[0].age;
      currentExp = docRes.rows[0].year_of_experience;
      currentNationalId = docRes.rows[0].national_id;
    }
  }

  if (data.gender !== undefined) {
    const cleanGender = String(data.gender).trim().toLowerCase();
    if (cleanGender === "male" || cleanGender === "female") {
      if (currentNationalId) {
        const genderDigit = Number(String(currentNationalId).trim()[12]);
        const derivedGender = (genderDigit % 2 === 0) ? "female" : "male";
        if (cleanGender !== derivedGender) {
          const err = new Error(`Entered gender (${data.gender}) does not match the gender derived from National ID (${derivedGender}).`);
          err.status = 400;
          throw err;
        }
      }
    }
  }


  if (data.age !== undefined) {
    const numericAge = Number(data.age);
    if (isNaN(numericAge) || numericAge < 23 || numericAge > 75 || !Number.isInteger(numericAge)) {
      const err = new Error("Invalid age. Must be an integer between 23 and 75.");
      err.status = 400;
      throw err;
    }

    if (currentNationalId) {
      const birthDate = getBirthDateFromNationalId(currentNationalId);
      if (birthDate) {
        const calculatedAge = calculateAge(birthDate);
        if (numericAge !== calculatedAge) {
          const err = new Error(`Entered age (${numericAge}) does not match the age calculated from National ID (${calculatedAge}).`);
          err.status = 400;
          throw err;
        }
      }
    }
    currentAge = numericAge;
  }

  if (data.year_of_experience !== undefined) {
    const exp = Number(data.year_of_experience);
    if (isNaN(exp) || exp < 0 || exp > 45 || !Number.isInteger(exp)) {
      const err = new Error("Invalid Experience years. Must be an integer between 0 and 45.");
      err.status = 400;
      throw err;
    }
    currentExp = exp;
  }

  if (currentAge !== null && currentExp !== null) {
    if (currentExp > currentAge - 23) {
      const err = new Error(`Years of experience (${currentExp}) is unrealistic for age (${currentAge}). Maximum possible experience is ${currentAge - 23} years.`);
      err.status = 400;
      throw err;
    }
  }

  if (data.consultation_fee !== undefined) {
    const fee = Number(data.consultation_fee);
    if (isNaN(fee) || fee < 50 || fee > 3000 || !Number.isInteger(fee)) {
      const err = new Error("Invalid Consultation fee. Must be an integer between 50 and 3000 EGP.");
      err.status = 400;
      throw err;
    }
  }

  const allowedFields = [
    "name", "email", "phone", "gender", "clinic_address",
    "year_of_experience", "specialization", "consultation_fee", "age"
  ];
  const updates = [];
  const values = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIndex}`);
      if (field === "email") {
        values.push(String(data[field]).trim().toLowerCase());
      } else {
        values.push(data[field]);
      }
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    const err = new Error("No valid fields to update");
    err.status = 400;
    throw err;
  }

  values.push(doctorId);

  await pool.query(
    `UPDATE doctor SET ${updates.join(", ")} WHERE medical_syndicate_id_card = $${paramIndex}`,
    values
  );

  // Return updated profile
  const result = await pool.query(
    `SELECT
      medical_syndicate_id_card AS id,
      name, email, phone, gender, specialization,
      clinic_address, year_of_experience, rate,
      consultation_fee, national_id, syndicate_card_image,
      approval_status,
      'doctor' AS role
    FROM doctor
    WHERE medical_syndicate_id_card = $1`,
    [doctorId]
  );

  return {
    success: true,
    message: "Profile updated successfully",
    data: result.rows[0]
  };
};
