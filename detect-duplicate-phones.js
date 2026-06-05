/**
 * detect-duplicate-phones.js
 * ─────────────────────────────────────────────────────────────
 * Reports phone numbers that exist in more than one account
 * (patient, doctor). Run this to identify current conflicts.
 *
 * Usage:
 *   node detect-duplicate-phones.js
 */

require("dotenv").config();
const pool = require("./src/config/database");

function normalizePhone(phone) {
  if (!phone) return null;
  let p = String(phone).trim();
  if (p.startsWith("+20")) {
    p = "0" + p.slice(3);
  }
  return p;
}

async function detectDuplicates() {
  console.log("Scanning for duplicate phone numbers across patient and doctor tables...\n");

  try {
    const result = await pool.query(`
      SELECT phone, name, email, 'patient' AS role FROM patient WHERE phone IS NOT NULL AND phone != ''
      UNION ALL
      SELECT phone, name, email, 'doctor' AS role FROM doctor WHERE phone IS NOT NULL AND phone != ''
    `);

    // Group by normalized phone number
    const phoneGroups = {};
    for (const row of result.rows) {
      const normalized = normalizePhone(row.phone);
      if (!normalized) continue;
      if (!phoneGroups[normalized]) {
        phoneGroups[normalized] = [];
      }
      phoneGroups[normalized].push(row);
    }

    const duplicates = Object.entries(phoneGroups).filter(([_, list]) => list.length > 1);

    if (duplicates.length === 0) {
      console.log("✅ No duplicate phone numbers found! All phone numbers are unique.");
    } else {
      console.log(`⚠️  Found ${duplicates.length} phone number(s) registered to multiple accounts:\n`);
      for (const [phone, list] of duplicates) {
        console.log(`📱 Phone: ${phone} (Registered ${list.length} times):`);
        for (const item of list) {
          console.log(`   - [${item.role.toUpperCase()}] ${item.name} (${item.email}) - Raw: ${item.phone}`);
        }
        console.log("");
      }
    }
  } catch (err) {
    console.error("Detection failed:", err.message);
  } finally {
    await pool.end();
  }
}

detectDuplicates();
