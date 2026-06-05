/**
 * cleanup-duplicate-phones.js
 * ─────────────────────────────────────────────────────────────
 * Safely deletes duplicate accounts from patient and doctor tables
 * according to the user's specifications, preserving the requested accounts.
 *
 * Usage:
 *   node cleanup-duplicate-phones.js
 */

require("dotenv").config();
const pool = require("./src/config/database");

const CLEANUP_RULES = [
  {
    phone: "01228135447",
    keepEmail: "body@gmail.com",
    keepRole: "patient",
    description: "Keep bodysamir (body@gmail.com) and delete all other doctor/patient duplicates"
  },
  {
    phone: "01276487840",
    keepEmail: "samasimo@gmail.com",
    keepRole: "patient",
    description: "Keep samasimo Ahmed (samasimo@gmail.com) and delete all other patient duplicates"
  },
  {
    phone: "01146398028",
    keepEmail: "kareemsaid8688@gmail.com",
    keepRole: "patient",
    description: "Keep karim said (kareemsaid8688@gmail.com) and delete all other doctor/patient duplicates"
  },
  {
    phone: "01000000000",
    keepEmail: "abdallahtako5@gmail.com",
    keepRole: "patient",
    description: "Keep Abdallah Tako (abdallahtako5@gmail.com) and delete all other patient duplicates"
  },
  {
    phone: "01030967385",
    keepEmail: "radwaaboelyazead@gmail.com",
    keepRole: "patient",
    description: "Keep رضوى عصام حسن (radwaaboelyazead@gmail.com) and delete all other patient duplicates"
  }
];

function getPhoneVariants(phone) {
  const clean = String(phone).trim();
  let alternative = clean;
  if (clean.startsWith("+20")) {
    alternative = "0" + clean.slice(3);
  } else if (clean.startsWith("0")) {
    alternative = "+20" + clean.slice(1);
  }
  return [clean, alternative];
}

async function runCleanup() {
  const client = await pool.connect();
  try {
    console.log("Starting transactional cleanup of duplicate phone number accounts...\n");
    await client.query("BEGIN");

    for (const rule of CLEANUP_RULES) {
      console.log(`Processing rule for phone ${rule.phone}:`);
      console.log(`- Action: ${rule.description}`);

      const variants = getPhoneVariants(rule.phone);
      const keepEmail = rule.keepEmail.toLowerCase().trim();

      // Find patients to delete
      const patientsRes = await client.query(
        "SELECT patient_id AS id, name, email, phone FROM patient WHERE phone IN ($1, $2)",
        variants
      );
      
      const patientsToDelete = patientsRes.rows.filter(r => r.email.toLowerCase().trim() !== keepEmail);
      const patientToKeep = patientsRes.rows.find(r => r.email.toLowerCase().trim() === keepEmail);

      // Find doctors to delete
      const doctorsRes = await client.query(
        "SELECT medical_syndicate_id_card AS id, name, email, phone FROM doctor WHERE phone IN ($1, $2)",
        variants
      );
      
      const doctorsToDelete = doctorsRes.rows.filter(r => r.email.toLowerCase().trim() !== keepEmail);
      const doctorToKeep = doctorsRes.rows.find(r => r.email.toLowerCase().trim() === keepEmail);

      // Log Keep
      if (rule.keepRole === "patient" && patientToKeep) {
        console.log(`   ✅ KEEP [PATIENT]: ${patientToKeep.name} (${patientToKeep.email})`);
      } else if (rule.keepRole === "doctor" && doctorToKeep) {
        console.log(`   ✅ KEEP [DOCTOR]: ${doctorToKeep.name} (${doctorToKeep.email})`);
      } else {
        console.log(`   ⚠️ WARNING: Target account to keep (${keepEmail}) was not found in the database!`);
      }

      // Delete Patients
      for (const p of patientsToDelete) {
        console.log(`   ❌ DELETE [PATIENT]: ${p.name} (${p.email})`);
        await client.query("DELETE FROM patient WHERE patient_id = $1", [p.id]);
        // Also remove from password_reset if active code exists
        await client.query("DELETE FROM password_reset WHERE LOWER(email) = $1 AND role = 'patient'", [p.email.toLowerCase()]);
      }

      // Delete Doctors
      for (const d of doctorsToDelete) {
        console.log(`   ❌ DELETE [DOCTOR]: ${d.name} (${d.email})`);
        await client.query("DELETE FROM doctor WHERE medical_syndicate_id_card = $1", [d.id]);
        // Also remove from password_reset if active code exists
        await client.query("DELETE FROM password_reset WHERE LOWER(email) = $1 AND role = 'doctor'", [d.email.toLowerCase()]);
      }

      console.log("");
    }

    await client.query("COMMIT");
    console.log("🎉 Cleanup successfully completed! All transactions committed.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Cleanup failed, transaction rolled back. Error:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runCleanup();
