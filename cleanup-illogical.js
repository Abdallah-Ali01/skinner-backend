/**
 * cleanup-illogical.js
 * ─────────────────────────────────────────────────────────────
 * Finds and deletes doctor and patient accounts that have
 * illogical or invalid information (based on our registry validation rules).
 *
 * Usage:
 *   node cleanup-illogical.js
 */

require("dotenv").config();
const pool = require("./src/config/database");

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

function validatePatient(patient) {
  const errors = [];
  
  // 1. Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!patient.email || !emailRegex.test(String(patient.email).trim().toLowerCase())) {
    errors.push(`Invalid email format: "${patient.email}"`);
  }
  
  // 2. Phone format check (if present)
  if (patient.phone) {
    const cleanPhone = String(patient.phone).trim();
    if (!/^(\+20|0)(10|11|12|15)[0-9]{8}$/.test(cleanPhone)) {
      errors.push(`Invalid Egyptian phone format: "${patient.phone}"`);
    }
  }
  
  // 3. Age validation
  const numericAge = Number(patient.age);
  if (patient.age === undefined || patient.age === null || isNaN(numericAge) || numericAge < 13 || numericAge > 100 || !Number.isInteger(numericAge)) {
    errors.push(`Invalid age: "${patient.age}" (must be integer between 13 and 100)`);
  }
  
  return errors;
}

function validateDoctor(doctor) {
  const errors = [];
  
  // 1. Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!doctor.email || !emailRegex.test(String(doctor.email).trim().toLowerCase())) {
    errors.push(`Invalid email format: "${doctor.email}"`);
  }
  
  // 2. Phone validation
  if (!doctor.phone || !/^(\+20|0)(10|11|12|15)[0-9]{8}$/.test(String(doctor.phone).trim())) {
    errors.push(`Invalid Egyptian phone format: "${doctor.phone}"`);
  }
  
  // 3. National ID validation
  const cleanNationalId = String(doctor.national_id || "").trim();
  if (!/^[23][0-9]{13}$/.test(cleanNationalId)) {
    errors.push(`Invalid National ID format: "${doctor.national_id}"`);
  } else {
    const birthDate = getBirthDateFromNationalId(cleanNationalId);
    if (!birthDate) {
      errors.push(`National ID contains invalid birthdate: "${doctor.national_id}"`);
    } else {
      const calculatedAge = calculateAge(birthDate);
      const numericAge = Number(doctor.age);
      if (!isNaN(numericAge) && numericAge !== calculatedAge) {
        errors.push(`Age mismatch: entered age ${numericAge} vs calculated age ${calculatedAge} from National ID`);
      }
    }
  }
  
  // 4. Age validation
  const numericAge = Number(doctor.age);
  if (doctor.age === undefined || doctor.age === null || isNaN(numericAge) || numericAge < 23 || numericAge > 75 || !Number.isInteger(numericAge)) {
    errors.push(`Invalid age: "${doctor.age}" (must be integer between 23 and 75)`);
  }
  
  // 5. Experience validation
  const exp = Number(doctor.year_of_experience);
  if (doctor.year_of_experience === undefined || doctor.year_of_experience === null || isNaN(exp) || exp < 0 || exp > 45 || !Number.isInteger(exp)) {
    errors.push(`Invalid experience years: "${doctor.year_of_experience}" (must be integer between 0 and 45)`);
  } else if (!isNaN(numericAge) && exp > numericAge - 23) {
    errors.push(`Unrealistic experience: ${exp} years for age ${numericAge} (max possible is ${numericAge - 23})`);
  }
  
  // 6. Consultation fee validation
  const fee = Number(doctor.consultation_fee);
  if (doctor.consultation_fee === undefined || doctor.consultation_fee === null || isNaN(fee) || fee < 50 || fee > 3000 || !Number.isInteger(fee)) {
    errors.push(`Invalid consultation fee: "${doctor.consultation_fee}" (must be integer between 50 and 3000)`);
  }
  
  return errors;
}

async function runCleanup() {
  console.log("Starting DB scan for accounts with illogical/invalid information...\n");

  try {
    // 1. Fetch all patients
    const patientsRes = await pool.query("SELECT patient_id, name, email, phone, age FROM patient");
    const invalidPatients = [];
    
    for (const patient of patientsRes.rows) {
      const errors = validatePatient(patient);
      if (errors.length > 0) {
        invalidPatients.push({ ...patient, errors });
      }
    }

    // 2. Fetch all doctors
    const doctorsRes = await pool.query(
      "SELECT medical_syndicate_id_card, name, email, phone, national_id, age, year_of_experience, consultation_fee FROM doctor"
    );
    const invalidDoctors = [];

    for (const doctor of doctorsRes.rows) {
      const errors = validateDoctor(doctor);
      if (errors.length > 0) {
        invalidDoctors.push({ ...doctor, errors });
      }
    }

    // Report and Cleanup Patients
    console.log(`Patients scanned: ${patientsRes.rows.length}`);
    if (invalidPatients.length > 0) {
      console.log(`⚠️ Found ${invalidPatients.length} patient(s) with illogical data:\n`);
      for (const p of invalidPatients) {
        console.log(`  - Patient: [ID: ${p.patient_id}] "${p.name}" <${p.email}>`);
        p.errors.forEach(err => console.log(`      * ${err}`));
      }
      
      console.log("\nDeleting invalid patients...");
      const pIds = invalidPatients.map(p => p.patient_id);
      const deleteResult = await pool.query(
        "DELETE FROM patient WHERE patient_id = ANY($1::uuid[])",
        [pIds]
      );
      console.log(`✅ Successfully deleted ${deleteResult.rowCount} patient(s).`);
    } else {
      console.log("✅ All patient accounts have valid/logical information.");
    }

    console.log("\n" + "─".repeat(50) + "\n");

    // Report and Cleanup Doctors
    console.log(`Doctors scanned: ${doctorsRes.rows.length}`);
    if (invalidDoctors.length > 0) {
      console.log(`⚠️ Found ${invalidDoctors.length} doctor(s) with illogical data:\n`);
      for (const d of invalidDoctors) {
        console.log(`  - Doctor: [Card: ${d.medical_syndicate_id_card}] "${d.name}" <${d.email}>`);
        d.errors.forEach(err => console.log(`      * ${err}`));
      }
      
      console.log("\nDeleting invalid doctors...");
      const dCards = invalidDoctors.map(d => d.medical_syndicate_id_card);
      const deleteResult = await pool.query(
        "DELETE FROM doctor WHERE medical_syndicate_id_card = ANY($1::varchar[])",
        [dCards]
      );
      console.log(`✅ Successfully deleted ${deleteResult.rowCount} doctor(s).`);
    } else {
      console.log("✅ All doctor accounts have valid/logical information.");
    }

  } catch (err) {
    console.error("❌ Execution error:", err.message);
  } finally {
    await pool.end();
  }
}

runCleanup();
