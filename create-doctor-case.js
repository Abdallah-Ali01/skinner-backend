require("dotenv").config();
const pool = require("./src/config/database");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

async function run() {
  console.log("=== CREATING DOCTOR CASE STUDY WITH PENDING, ACTIVE FINISHED, AND EXPIRED CASES ===");

  const docEmail = "doctor_house@gmail.com";
  const defaultPassword = "password123";
  const doctorCard = "DOC-HOUSE-123";

  const patientsData = [
    {
      email: "patient_a@gmail.com",
      name: "John Doe (Pending Case)",
      phone: "01211223344",
      age: 30,
      address: "New York, NY",
      type: "pending",
      offsetDays: 2 // in the future
    },
    {
      email: "patient_b@gmail.com",
      name: "Jane Doe (Finished Case - Active Chat)",
      phone: "01511223344",
      age: 25,
      address: "Boston, MA",
      type: "active_finished",
      offsetDays: -3 // in the past, within 7 days
    },
    {
      email: "patient_c@gmail.com",
      name: "Bob Johnson (Finished Case - Locked Chat)",
      phone: "01111223344",
      age: 35,
      address: "Chicago, IL",
      type: "expired_finished",
      offsetDays: -10 // in the past, older than 7 days
    }
  ];

  try {
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // 1. Clean up old records to allow rerunability
    console.log("Cleaning up existing test data...");
    
    // Cascades will handle appointments, chats, payments, reports, etc.
    await pool.query("DELETE FROM doctor WHERE email = $1", [docEmail]);
    for (const p of patientsData) {
      await pool.query("DELETE FROM patient WHERE email = $1", [p.email]);
    }
    console.log("Cleanup finished.");

    // 2. Create the Doctor
    // National ID 28405151204432 parses as 15th May 1984.
    // In 2026, age must be 42 to match national ID calculation in validation script.
    console.log(`Creating doctor: ${docEmail}...`);
    await pool.query(
      `INSERT INTO doctor (
        medical_syndicate_id_card, name, phone, gender, email, national_id, 
        password, rate, year_of_experience, specialization, clinic_address, 
        approval_status, consultation_fee, age, syndicate_card_image
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        doctorCard,
        "Dr. Gregory House",
        "01011223344",
        "male",
        docEmail,
        "28405151204432",
        passwordHash,
        4.80,
        15,
        "Dermatology",
        "Princeton-Plainsboro, NJ",
        "approved",
        350,
        42,
        "https://images.unsplash.com/photo-1622253692010-333f2da6031d"
      ]
    );
    console.log(`Doctor created successfully.`);

    // 3. Process each Patient case
    for (const p of patientsData) {
      console.log(`\nCreating case for Patient: ${p.name} (${p.email})...`);
      
      const patientId = uuidv4();
      await pool.query(
        `INSERT INTO patient (patient_id, name, phone, gender, email, password, age, address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [patientId, p.name, p.phone, p.type === "active_finished" ? "female" : "male", p.email, passwordHash, p.age, p.address]
      );

      // Create Skin Analysis
      const analysisId = uuidv4();
      let disease = "Eczema";
      let treatment = "Apply topical hydrocortisone and keep skin hydrated.";
      if (p.type === "active_finished") {
        disease = "Acne Vulgaris";
        treatment = "Wash face with salicylic acid cleanser and apply benzoyl peroxide gel.";
      } else if (p.type === "expired_finished") {
        disease = "Psoriasis";
        treatment = "Use coal tar extract shampoo and topical corticosteroid ointment.";
      }

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
         VALUES ($1, $2, 'Dr. Gregory House', 350, $3, 'confirmed', $4, $5)`,
        [appointmentId, patientId, apptDate, doctorCard, analysisId]
      );

      // Create Payment
      const paymentId = uuidv4();
      const transRef = "ref_case_" + p.type + "_" + Date.now();
      await pool.query(
        `INSERT INTO payment (payment_id, appointment_id, method, card_holder_name, card_last4, transaction_reference, transaction_date, payment_status, amount, otp_verified)
         VALUES ($1, $2, 'card', $3, '4242', $4, $5, 'paid', 350, true)`,
        [paymentId, appointmentId, p.name, transRef, apptDate]
      );

      // Create Chat
      const chatId = uuidv4();
      // Chat C is locked (expired_finished)
      const chatStatus = p.type === "expired_finished" ? "locked" : "active";
      
      await pool.query(
        `INSERT INTO chat (chat_id, appointment_id, patient_id, medical_syndicate_id_card, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [chatId, appointmentId, patientId, doctorCard, chatStatus, apptDate]
      );

      // If finished, insert report & chat messages
      if (p.type !== "pending") {
        // Create Report
        const reportId = uuidv4();
        const diagnosisText = p.type === "active_finished" ? "Severe Acne Vulgaris (Acne)" : "Chronic Plaque Psoriasis";
        const prescriptionText = p.type === "active_finished" 
          ? "Clindamycin phosphate topical gel 1% - apply thin layer twice daily.\nSalicylic Acid 2% Face Wash."
          : "Clobetasol propionate cream 0.05% - apply to plaques twice daily for 2 weeks.";
        
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
      } else {
        // Pending case: just a simple greeting message in chat
        const msgId = uuidv4();
        await pool.query(
          `INSERT INTO chat_message (message_id, chat_id, sender_role, sender_id, message_text, message_type, sent_at)
           VALUES ($1, $2, 'patient', $3, 'I booked the appointment. Looking forward to our consultation!', 'text', NOW())`,
          [msgId, chatId, patientId]
        );
      }
      
      console.log(`Successfully configured case: ${p.type}`);
    }

    console.log("\n==================================================");
    console.log("✅ DOCTOR AND CASE STUDY SCENARIOS CREATED SUCCESSFULLY!");
    console.log("==================================================");
    console.log("🔑 DOCTOR CREDENTIALS:");
    console.log(`   Email:      ${docEmail}`);
    console.log(`   Password:   ${defaultPassword}`);
    console.log(`   Card ID:    ${doctorCard}`);
    console.log("--------------------------------------------------");
    console.log("🔑 PATIENT CREDENTIALS:");
    for (const p of patientsData) {
      console.log(`   Name:       ${p.name}`);
      console.log(`   Email:      ${p.email}`);
      console.log(`   Password:   ${defaultPassword}`);
      console.log("   ---");
    }
    console.log("==================================================");

  } catch (err) {
    console.error("❌ Failed to create doctor case study:", err);
  } finally {
    await pool.end();
  }
}

run();
