require("dotenv").config();
const pool = require("./src/config/database");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

async function run() {
  console.log("=== STARTING ASSIGNMENT OF FINISHED CASES FOR MAHMOUD ===");

  const docEmail = "mahmoudsamir4326@gmail.com";
  const defaultPassword = "password123";

  try {
    // 1. Fetch Doctor details
    const docRes = await pool.query("SELECT * FROM doctor WHERE LOWER(email) = LOWER($1)", [docEmail]);
    if (docRes.rows.length === 0) {
      console.error(`❌ Doctor with email "${docEmail}" was not found in the database.`);
      return;
    }
    const doctor = docRes.rows[0];
    const doctorCard = doctor.medical_syndicate_id_card;
    const doctorName = doctor.name;
    console.log(`Found Doctor: ${doctorName} with Card: ${doctorCard}`);

    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const patientsData = [
      {
        email: "patient_samir_active@gmail.com",
        name: "Youssef Ali (Active Follow-Up)",
        phone: "01099887766",
        age: 27,
        address: "Cairo, Egypt",
        type: "active_finished",
        offsetDays: -3 // inside follow-up range (lasted 7 days)
      },
      {
        email: "patient_samir_expired@gmail.com",
        name: "Hassan Ibrahim (Expired Follow-Up)",
        phone: "01055443322",
        age: 42,
        address: "Alexandria, Egypt",
        type: "expired_finished",
        offsetDays: -10 // expired follow-up range (older than 7 days)
      }
    ];

    // 2. Clean up existing test patients for rerunability
    console.log("Cleaning up old test patients...");
    for (const p of patientsData) {
      await pool.query("DELETE FROM patient WHERE email = $1", [p.email]);
    }

    // 3. Create patients and assign cases
    for (const p of patientsData) {
      console.log(`\nCreating case for Patient: ${p.name} (${p.email})...`);
      
      const patientId = uuidv4();
      await pool.query(
        `INSERT INTO patient (patient_id, name, phone, gender, email, password, age, address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
         [patientId, p.name, p.phone, "male", p.email, passwordHash, p.age, p.address]
      );

      // Create Skin Analysis
      const analysisId = uuidv4();
      const disease = p.type === "active_finished" ? "Eczema" : "Psoriasis";
      const treatment = p.type === "active_finished" 
        ? "Apply topical hydrocortisone and keep skin hydrated."
        : "Use coal tar extract shampoo and topical corticosteroid ointment.";

      await pool.query(
        `INSERT INTO analysis (analysis_id, patient_id, skin_disease_classification, skin_image_upload, treatment_suggestion, doctor_recommendation)
         VALUES ($1, $2, $3, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae', $4, 'Please follow the diagnosis details.')`,
        [analysisId, patientId, disease, treatment]
      );

      // Set Appointment Date based on offsetDays
      const appointmentId = uuidv4();
      const apptDate = new Date();
      apptDate.setDate(apptDate.getDate() + p.offsetDays);
      
      // Create Appointment
      await pool.query(
        `INSERT INTO appointment (appointment_id, patient_id, doctor_name, total_cost, date, status, medical_syndicate_id_card, analysis_id)
         VALUES ($1, $2, $3, $4, $5, 'confirmed', $6, $7)`,
        [appointmentId, patientId, doctorName, doctor.consultation_fee || 150, apptDate, doctorCard, analysisId]
      );

      // Create Payment
      const paymentId = uuidv4();
      const transRef = "ref_samir_" + p.type + "_" + Date.now();
      await pool.query(
        `INSERT INTO payment (payment_id, appointment_id, method, card_holder_name, card_last4, transaction_reference, transaction_date, payment_status, amount, otp_verified)
         VALUES ($1, $2, 'card', $3, '1111', $4, $5, 'paid', $6, true)`,
        [paymentId, appointmentId, p.name, transRef, apptDate, doctor.consultation_fee || 150]
      );

      // Create Chat
      const chatId = uuidv4();
      const chatStatus = p.type === "expired_finished" ? "locked" : "active";
      
      await pool.query(
        `INSERT INTO chat (chat_id, appointment_id, patient_id, medical_syndicate_id_card, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [chatId, appointmentId, patientId, doctorCard, chatStatus, apptDate]
      );

      // Create Report
      const reportId = uuidv4();
      const diagnosisText = p.type === "active_finished" ? "Severe Atopic Dermatitis (Eczema)" : "Chronic Plaque Psoriasis";
      const prescriptionText = p.type === "active_finished" 
        ? "Hydrocortisone cream 1% - apply twice daily.\nCetaphil moisturizing lotion - apply frequently."
        : "Clobetasol propionate cream 0.05% - apply to plaques twice daily.";
      
      await pool.query(
        `INSERT INTO report (report_id, appointment_id, patient_id, medical_syndicate_id_card, diagnosis, prescription, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'Follow up instructions provided.', $7)`,
        [reportId, appointmentId, patientId, doctorCard, diagnosisText, prescriptionText, apptDate]
      );

      // Chat messages
      const msg1Id = uuidv4();
      const msg2Id = uuidv4();
      const systemMsgId = uuidv4();

      const time1 = new Date(apptDate.getTime() + 10 * 60 * 1000);
      const time2 = new Date(apptDate.getTime() + 20 * 60 * 1000);
      
      // Message from patient
      await pool.query(
        `INSERT INTO chat_message (message_id, chat_id, sender_role, sender_id, message_text, message_type, sent_at)
         VALUES ($1, $2, 'patient', $3, 'Hello doctor, can you please review my skin analysis results?', 'text', $4)`,
        [msg1Id, chatId, patientId, time1]
      );

      // Message from doctor
      await pool.query(
        `INSERT INTO chat_message (message_id, chat_id, sender_role, sender_id, message_text, message_type, sent_at)
         VALUES ($1, $2, 'doctor', $3, 'Hello! I have reviewed your scan. I will write down your diagnosis and prescription shortly.', 'text', $4)`,
        [msg2Id, chatId, doctorCard, time2]
      );

      // System notification message
      const reportNotifyText = `📋 Report submitted:\n\n${diagnosisText}`;
      await pool.query(
        `INSERT INTO chat_message (message_id, chat_id, sender_role, sender_id, message_text, message_type, sent_at)
         VALUES ($1, $2, 'system', $3, $4, 'system', $5)`,
        [systemMsgId, chatId, doctorCard, reportNotifyText, time2]
      );

      console.log(`Successfully configured case: ${p.type}`);
    }

    console.log("\n==================================================");
    console.log("✅ CASES FOR DOCTOR MAHMOUD SAMIR CONFIGURED SUCCESSFULLY!");
    console.log("==================================================");
    console.log(`   Doctor Name:  ${doctorName}`);
    console.log(`   Doctor Email: ${docEmail}`);
    console.log(`   Doctor Card:  ${doctorCard}`);
    console.log("--------------------------------------------------");
    console.log("   Patient 1 (Active follow-up chat, -3 days):");
    console.log("     Name:       Youssef Ali");
    console.log("     Email:      patient_samir_active@gmail.com");
    console.log("   Patient 2 (Expired follow-up chat, -10 days):");
    console.log("     Name:       Hassan Ibrahim");
    console.log("     Email:      patient_samir_expired@gmail.com");
    console.log("==================================================");

  } catch (err) {
    console.error("❌ Failed to configure doctor cases:", err);
  } finally {
    await pool.end();
  }
}

run();
