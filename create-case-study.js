require("dotenv").config();
const pool = require("./src/config/database");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

async function run() {
  console.log("=== CREATING CASE STUDY FOR DR. MARIZ ATEF ===");

  const docEmail = "mariz@gmail.com";
  const patientEmail = "mariz_patient@gmail.com";
  const defaultPassword = "123456";

  try {
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // 1. Find or create doctor
    let doctorCard = "DOC-MARIZ-ATEF";
    let doctorName = "Dr. Mariz Atef";

    const docCheck = await pool.query("SELECT * FROM doctor WHERE email = $1", [docEmail]);
    if (docCheck.rows.length > 0) {
      const docRow = docCheck.rows[0];
      doctorCard = docRow.medical_syndicate_id_card;
      doctorName = docRow.name;
      console.log(`Doctor found: ${doctorName} (${doctorCard})`);
      if (docRow.approval_status !== "approved") {
        await pool.query("UPDATE doctor SET approval_status = 'approved' WHERE email = $1", [docEmail]);
        console.log("Updated doctor approval status to 'approved'.");
      }
    } else {
      console.log(`Doctor ${docEmail} not found. Creating new doctor...`);
      await pool.query(
        `INSERT INTO doctor (medical_syndicate_id_card, name, email, password, specialization, approval_status, consultation_fee, age, gender)
         VALUES ($1, $2, $3, $4, 'Dermatology', 'approved', 250, 32, 'female')`,
        [doctorCard, doctorName, docEmail, passwordHash]
      );
      console.log(`Doctor ${doctorName} created successfully.`);
    }

    // 2. Find or create patient
    let patientId = uuidv4();
    const patientCheck = await pool.query("SELECT * FROM patient WHERE email = $1", [patientEmail]);
    if (patientCheck.rows.length > 0) {
      patientId = patientCheck.rows[0].patient_id;
      console.log(`Patient found: ${patientCheck.rows[0].name} (${patientId})`);
    } else {
      console.log(`Patient ${patientEmail} not found. Creating new patient...`);
      await pool.query(
        `INSERT INTO patient (patient_id, name, email, password, age, gender, address)
         VALUES ($1, 'Alex Smith', $2, $3, 28, 'male', 'Cairo, Egypt')`,
        [patientId, patientEmail, passwordHash]
      );
      console.log("Patient created successfully.");
    }

    // 3. Create analysis for the patient
    const analysisId = uuidv4();
    console.log(`Creating skin analysis (${analysisId})...`);
    await pool.query(
      `INSERT INTO analysis (analysis_id, patient_id, skin_disease_classification, skin_image_upload, treatment_suggestion, doctor_recommendation)
       VALUES ($1, $2, 'Eczema', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae', 
               'Apply topical hydrocortisone cream and keep the skin well hydrated with a gentle moisturizer.',
               'Please schedule a follow-up appointment if symptoms persist after 7 days.')`,
      [analysisId, patientId]
    );

    // 4. Create appointment yesterday (active follow-up)
    const appointmentId = uuidv4();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); // exactly 1 day ago
    yesterday.setHours(yesterday.getHours() - 2); // 2 hours offset to ensure it's in the past

    console.log(`Creating appointment yesterday (${appointmentId})...`);
    await pool.query(
      `INSERT INTO appointment (appointment_id, patient_id, doctor_name, total_cost, date, status, medical_syndicate_id_card, analysis_id)
       VALUES ($1, $2, $3, 300, $4, 'confirmed', $5, $6)`,
      [appointmentId, patientId, doctorName, yesterday, doctorCard, analysisId]
    );

    // 5. Create payment
    const paymentId = uuidv4();
    const transRef = "ref_case_study_" + Date.now();
    console.log(`Creating payment record (${paymentId})...`);
    await pool.query(
      `INSERT INTO payment (payment_id, appointment_id, method, card_holder_name, card_last4, transaction_reference, transaction_date, payment_status, amount, otp_verified)
       VALUES ($1, $2, 'card', 'Alex Smith', '4242', $3, $4, 'paid', 300, true)`,
      [paymentId, appointmentId, transRef, yesterday]
    );

    // 6. Find or create chat
    let chatId = uuidv4();
    const chatCheck = await pool.query(
      `SELECT chat_id FROM chat WHERE patient_id = $1 AND medical_syndicate_id_card = $2`,
      [patientId, doctorCard]
    );

    if (chatCheck.rows.length > 0) {
      chatId = chatCheck.rows[0].chat_id;
      console.log(`Reusing existing chat (${chatId})`);
      await pool.query(
        `UPDATE chat SET appointment_id = $1, status = 'active', updated_at = NOW() WHERE chat_id = $2`,
        [appointmentId, chatId]
      );
    } else {
      console.log(`Creating new chat (${chatId})...`);
      await pool.query(
        `INSERT INTO chat (chat_id, appointment_id, patient_id, medical_syndicate_id_card, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'active', $5, NOW())`,
        [chatId, appointmentId, patientId, doctorCard, yesterday]
      );
    }

    // 7. Create report
    const reportId = uuidv4();
    console.log(`Creating diagnosis report (${reportId})...`);
    await pool.query(
      `INSERT INTO report (report_id, appointment_id, patient_id, medical_syndicate_id_card, diagnosis, prescription, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        reportId,
        appointmentId,
        patientId,
        doctorCard,
        "Atopic Dermatitis (Eczema)",
        "Hydrocortisone cream 1% - apply a thin layer to the affected area twice daily for 7 days.\nCeraVe Moisturizing Cream - apply generously after bathing and as needed throughout the day.",
        "Avoid long, hot showers. Use gentle, fragrance-free skin cleansers. If the rash becomes weepy, honey-colored, or painful, contact the doctor immediately as this may indicate secondary infection.",
        yesterday
      ]
    );

    // 8. Insert test chat messages
    console.log("Inserting test messages into chat...");
    // Clear any messages for this chat first to make it clean
    await pool.query("DELETE FROM chat_message WHERE chat_id = $1", [chatId]);

    const msg1Id = uuidv4();
    const msg2Id = uuidv4();
    const msg3Id = uuidv4();

    const time1 = new Date(yesterday.getTime() + 10 * 60 * 1000); // 10 mins after appointment start
    const time2 = new Date(yesterday.getTime() + 15 * 60 * 1000); // 15 mins after
    const time3 = new Date(yesterday.getTime() + 20 * 60 * 1000); // 20 mins after

    await pool.query(
      `INSERT INTO chat_message (message_id, chat_id, sender_role, sender_id, message_text, message_type, sent_at)
       VALUES ($1, $2, 'doctor', $3, 'Hello Alex, I have reviewed your skin analysis and uploaded the diagnosis and prescription. Let me know if you have any questions.', 'text', $4)`,
      [msg1Id, chatId, doctorCard, time1]
    );

    await pool.query(
      `INSERT INTO chat_message (message_id, chat_id, sender_role, sender_id, message_text, message_type, sent_at)
       VALUES ($1, $2, 'patient', $3, 'Thank you, Dr. Mariz! Should I apply the hydrocortisone cream on wet or dry skin?', 'text', $4)`,
      [msg2Id, chatId, patientId, time2]
    );

    await pool.query(
      `INSERT INTO chat_message (message_id, chat_id, sender_role, sender_id, message_text, message_type, sent_at)
       VALUES ($1, $2, 'doctor', $3, 'Apply it on dry skin, preferably about 15 minutes after bathing. Make sure to apply the moisturizer after the cream.', 'text', $4)`,
      [msg3Id, chatId, doctorCard, time3]
    );

    console.log("\n✅ CASE STUDY CREATED SUCCESSFULLY!");
    console.log("--------------------------------------------------");
    console.log("🔑 DOCTOR LOGIN DETAILS:");
    console.log(`   Email:    ${docEmail}`);
    console.log(`   Password: ${defaultPassword}`);
    console.log("--------------------------------------------------");
    console.log("🔑 PATIENT LOGIN DETAILS:");
    console.log(`   Email:    ${patientEmail}`);
    console.log(`   Password: ${defaultPassword}`);
    console.log("--------------------------------------------------");
    console.log("This case features:");
    console.log(" - A past appointment (yesterday)");
    console.log(" - A fully completed report");
    console.log(" - Active follow-up chat period (approx. 6 days remaining)");

  } catch (err) {
    console.error("❌ Failed to create case study:", err);
  } finally {
    pool.end();
  }
}

run();
