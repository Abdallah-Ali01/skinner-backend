/**
 * detect-duplicate-emails.js
 * ─────────────────────────────────────────────────────────────
 * Reports email addresses that exist in more than one role table
 * (patient, doctor, admin). Run this BEFORE deploying the global
 * email uniqueness enforcement to identify conflicts.
 *
 * Usage:
 *   node detect-duplicate-emails.js
 */

require("dotenv").config();
const pool = require("./src/config/database");

async function detectDuplicates() {
  console.log("Scanning for duplicate emails across patient, doctor, and admin tables...\n");

  try {
    const result = await pool.query(`
      SELECT email, array_agg(role) AS roles, count(*) AS role_count
      FROM (
        SELECT LOWER(email) AS email, 'patient' AS role FROM patient
        UNION ALL
        SELECT LOWER(email) AS email, 'doctor' AS role FROM doctor
        UNION ALL
        SELECT LOWER(email) AS email, 'admin' AS role FROM admin
      ) all_emails
      GROUP BY email
      HAVING count(*) > 1
      ORDER BY email
    `);

    if (result.rows.length === 0) {
      console.log("✅ No duplicate emails found! All emails are unique across roles.");
    } else {
      console.log(`⚠️  Found ${result.rows.length} email(s) registered in multiple roles:\n`);
      console.log("─".repeat(70));
      console.log(`  ${"Email".padEnd(35)} Roles`);
      console.log("─".repeat(70));

      for (const row of result.rows) {
        const roles = Array.isArray(row.roles) ? row.roles.join(", ") : row.roles;
        console.log(`  ${row.email.padEnd(35)} ${roles}`);
      }

      console.log("─".repeat(70));
      console.log(`\nTotal conflicts: ${result.rows.length}`);
      console.log("\nThese users can still log in normally, but new registrations");
      console.log("with these emails will be blocked by the global uniqueness check.");
    }
  } catch (err) {
    console.error("Detection failed:", err.message);
  } finally {
    await pool.end();
  }
}

detectDuplicates();
