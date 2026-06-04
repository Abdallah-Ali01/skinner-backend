require("dotenv").config();
const pool = require("./src/config/database");

async function run() {
  console.log("=== EXPIRING FOLLOW-UP FOR DR. MARIZ ATEF CASE STUDY ===");

  const docEmail = "mariz@gmail.com";
  const patientEmail = "mariz_patient@gmail.com";

  try {
    // Update appointment date to 8 days ago to exceed the 7-day follow-up period
    const result = await pool.query(
      `UPDATE appointment 
       SET date = NOW() - INTERVAL '8 days'
       WHERE patient_id = (SELECT patient_id FROM patient WHERE email = $1)
         AND medical_syndicate_id_card = (SELECT medical_syndicate_id_card FROM doctor WHERE email = $2)
       RETURNING appointment_id, date`,
      [patientEmail, docEmail]
    );

    if (result.rows.length > 0) {
      console.log("\n✅ SUCCESS!");
      console.log(`Updated ${result.rows.length} appointment(s) to a date in the past.`);
      console.log(`New appointment date: ${result.rows[0].date}`);
      console.log("The follow-up period has now expired. The chat is now locked (read-only) and the report is read-only.");
    } else {
      console.log("❌ No matching appointment found for this case study.");
    }
  } catch (err) {
    console.error("❌ Error updating appointment date:", err);
  } finally {
    pool.end();
  }
}

run();
