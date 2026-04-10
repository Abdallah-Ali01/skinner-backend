const pool = require("../config/database");

/**
 * Update patient profile (only allowed fields).
 */
exports.updatePatientProfile = async (patientId, data) => {
  const allowedFields = ["name", "phone", "gender", "age", "address", "patient_history"];
  const updates = [];
  const values = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIndex}`);
      values.push(data[field]);
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
  const allowedFields = [
    "name", "phone", "gender", "clinic_address",
    "year_of_experience", "specialization", "consultation_fee"
  ];
  const updates = [];
  const values = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIndex}`);
      values.push(data[field]);
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
