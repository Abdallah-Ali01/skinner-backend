const pool = require("./src/config/database");

async function run() {
  try {
    console.log("Testing stats query...");
    const patientsCount = await pool.query("SELECT COUNT(*) AS count FROM patient");
    console.log("Patients count:", patientsCount.rows[0].count);

    const approvedDoctorsCount = await pool.query("SELECT COUNT(*) AS count FROM doctor WHERE approval_status = 'approved'");
    console.log("Approved doctors count:", approvedDoctorsCount.rows[0].count);

    const pendingDoctorsCount = await pool.query("SELECT COUNT(*) AS count FROM doctor WHERE approval_status = 'pending'");
    console.log("Pending doctors count:", pendingDoctorsCount.rows[0].count);

    const analysesCount = await pool.query("SELECT COUNT(*) AS count FROM analysis");
    console.log("Analyses count:", analysesCount.rows[0].count);

    console.log("\nTesting users query...");
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
    console.log("Patients fetched:", patientsRes.rows.length);

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
    console.log("Doctors fetched:", doctorsRes.rows.length);
    console.log("All DB queries succeeded!");
  } catch (err) {
    console.error("DB Query failed:", err);
  } finally {
    pool.end();
  }
}

run();
