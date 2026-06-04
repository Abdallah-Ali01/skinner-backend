const pool = require("./src/config/database");

async function run() {
  try {
    console.log("Checking for rejected doctors...");
    const check = await pool.query(
      "SELECT medical_syndicate_id_card, name, email FROM doctor WHERE approval_status = 'rejected'"
    );
    console.log(`Found ${check.rows.length} rejected doctor(s).`);
    
    if (check.rows.length > 0) {
      console.log("Deleting rejected doctors...");
      const result = await pool.query("DELETE FROM doctor WHERE approval_status = 'rejected'");
      console.log(`Successfully deleted ${result.rowCount} doctor(s) from the database.`);
    } else {
      console.log("No rejected doctors to delete.");
    }
  } catch (err) {
    console.error("Cleanup failed:", err);
  } finally {
    pool.end();
  }
}

run();
