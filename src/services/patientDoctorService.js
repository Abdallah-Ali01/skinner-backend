const pool = require("../config/database");

/**
 * List all approved doctors visible to patients.
 * Supports optional filters: specialization, search (name), and sorting.
 */
exports.listDoctors = async (query) => {
  const { specialization, search, sort } = query;

  let sql = `
    SELECT
      d.medical_syndicate_id_card,
      d.name,
      d.specialization,
      d.rate,
      d.year_of_experience,
      d.clinic_address,
      d.consultation_fee,
      d.gender
    FROM doctor d
    WHERE d.approval_status = 'approved'
  `;

  const values = [];
  let paramIndex = 1;

  if (specialization) {
    sql += ` AND LOWER(d.specialization) = LOWER($${paramIndex})`;
    values.push(specialization);
    paramIndex++;
  }

  if (search) {
    sql += ` AND LOWER(d.name) LIKE LOWER($${paramIndex})`;
    values.push(`%${search}%`);
    paramIndex++;
  }

  // Sorting options
  switch (sort) {
    case "rating":
      sql += ` ORDER BY d.rate DESC NULLS LAST`;
      break;
    case "experience":
      sql += ` ORDER BY d.year_of_experience DESC NULLS LAST`;
      break;
    case "fee_asc":
      sql += ` ORDER BY d.consultation_fee ASC NULLS LAST`;
      break;
    case "fee_desc":
      sql += ` ORDER BY d.consultation_fee DESC NULLS LAST`;
      break;
    default:
      sql += ` ORDER BY d.rate DESC NULLS LAST, d.year_of_experience DESC NULLS LAST`;
  }

  const result = await pool.query(sql, values);

  return {
    success: true,
    count: result.rows.length,
    data: result.rows
  };
};

/**
 * Get a single approved doctor's public profile by ID.
 */
exports.getDoctorById = async (doctorId) => {
  const result = await pool.query(
    `
    SELECT
      d.medical_syndicate_id_card,
      d.name,
      d.specialization,
      d.rate,
      d.year_of_experience,
      d.clinic_address,
      d.consultation_fee,
      d.gender,
      d.email,
      d.phone
    FROM doctor d
    WHERE d.medical_syndicate_id_card = $1
      AND d.approval_status = 'approved'
    `,
    [doctorId]
  );

  if (result.rows.length === 0) {
    const err = new Error("Doctor not found or not approved");
    err.status = 404;
    throw err;
  }

  return {
    success: true,
    data: result.rows[0]
  };
};
