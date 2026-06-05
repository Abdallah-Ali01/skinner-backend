require("dotenv").config();
const pool = require("./src/config/database");
const { v4: uuidv4 } = require("uuid");

async function assignCase() {
  const patientEmail = "samsimo@gmail.com";
  const doctorEmail = "negm@gmail.com";

  console.log(`Assigning finished case for Patient: ${patientEmail} to Doctor: ${doctorEmail}...`);

  try {
    // 1. Fetch Patient
    const patientRes = await pool.query(
      "SELECT patient_id, name FROM patient WHERE LOWER(email) = LOWER($1)",
      [patientEmail]
    );
    if (patientRes.rows.length === 0) {
      console.error(`Error: Patient with email '${patientEmail}' not found.`);
      process.exit(1);
    }
    const patient = patientRes.rows[0];
    console.log(`Found Patient: ${patient.name} (ID: ${patient.patient_id})`);

    // 2. Fetch Doctor
    const doctorRes = await pool.query(
      "SELECT medical_syndicate_id_card, name, consultation_fee FROM doctor WHERE LOWER(email) = LOWER($1)",
      [doctorEmail]
    );
    if (doctorRes.rows.length === 0) {
      console.error(`Error: Doctor with email '${doctorEmail}' not found.`);
      process.exit(1);
    }
    const doctor = doctorRes.rows[0];
    console.log(`Found Doctor: ${doctor.name} (ID: ${doctor.medical_syndicate_id_card})`);

    // Start Transaction
    await pool.query("BEGIN");

    // 3. Find or Create Analysis
    let analysisId;
    const analysisRes = await pool.query(
      "SELECT analysis_id FROM analysis WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 1",
      [patient.patient_id]
    );

    if (analysisRes.rows.length > 0) {
      analysisId = analysisRes.rows[0].analysis_id;
      console.log(`Using existing skin analysis: ${analysisId}`);
    } else {
      analysisId = uuidv4();
      await pool.query(
        `INSERT INTO analysis (analysis_id, patient_id, skin_disease_classification, skin_image_upload, treatment_suggestion, doctor_recommendation)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          analysisId,
          patient.patient_id,
          "Eczema",
          "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae",
          "Apply topical hydrocortisone and keep skin hydrated.",
          "Please follow the diagnosis details."
        ]
      );
      console.log(`Created new skin analysis: ${analysisId}`);
    }

    // 4. Create or Update Appointment
    let appointmentId;
    const appointmentRes = await pool.query(
      `SELECT appointment_id FROM appointment 
       WHERE patient_id = $1 AND medical_syndicate_id_card = $2 AND status != 'cancelled'
       ORDER BY date DESC LIMIT 1`,
      [patient.patient_id, doctor.medical_syndicate_id_card]
    );

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3); // 3 days ago to ensure it registers as a past case

    if (appointmentRes.rows.length > 0) {
      appointmentId = appointmentRes.rows[0].appointment_id;
      console.log(`Updating existing appointment: ${appointmentId}`);
      await pool.query(
        `UPDATE appointment SET date = $1, status = 'confirmed' WHERE appointment_id = $2`,
        [pastDate, appointmentId]
      );
    } else {
      appointmentId = uuidv4();
      const fee = parseFloat(doctor.consultation_fee) || 150;
      await pool.query(
        `INSERT INTO appointment (appointment_id, patient_id, doctor_name, total_cost, date, status, medical_syndicate_id_card, analysis_id)
         VALUES ($1, $2, $3, $4, $5, 'confirmed', $6, $7)`,
        [
          appointmentId,
          patient.patient_id,
          doctor.name,
          fee,
          pastDate,
          doctor.medical_syndicate_id_card,
          analysisId
        ]
      );
      console.log(`Created new appointment: ${appointmentId}`);
    }

    // 5. Ensure Payment exists and is paid
    const paymentRes = await pool.query(
      "SELECT payment_id FROM payment WHERE appointment_id = $1",
      [appointmentId]
    );

    if (paymentRes.rows.length > 0) {
      console.log(`Payment already exists for appointment. Updating payment status to paid...`);
      await pool.query(
        "UPDATE payment SET payment_status = 'paid' WHERE appointment_id = $1",
        [appointmentId]
      );
    } else {
      const paymentId = uuidv4();
      const transRef = "ref_case_manual_" + Date.now();
      const fee = parseFloat(doctor.consultation_fee) || 150;
      await pool.query(
        `INSERT INTO payment (payment_id, appointment_id, method, card_holder_name, card_last4, transaction_reference, transaction_date, payment_status, amount, otp_verified)
         VALUES ($1, $2, 'card', $3, '4242', $4, $5, 'paid', $6, true)`,
        [paymentId, appointmentId, patient.name, transRef, pastDate, fee]
      );
      console.log(`Created paid payment record.`);
    }

    // 6. Ensure Chat exists
    let chatId;
    const chatRes = await pool.query(
      `SELECT chat_id FROM chat WHERE patient_id = $1 AND medical_syndicate_id_card = $2`,
      [patient.patient_id, doctor.medical_syndicate_id_card]
    );

    if (chatRes.rows.length > 0) {
      chatId = chatRes.rows[0].chat_id;
      console.log(`Chat already exists: ${chatId}`);
    } else {
      chatId = uuidv4();
      await pool.query(
        `INSERT INTO chat (chat_id, appointment_id, patient_id, medical_syndicate_id_card, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'active', $5, NOW())`,
        [chatId, appointmentId, patient.patient_id, doctor.medical_syndicate_id_card, pastDate]
      );
      console.log(`Created new chat channel: ${chatId}`);
    }

    // 7. Ensure Report exists (this is what marks it as finished case)
    const reportRes = await pool.query(
      "SELECT report_id FROM report WHERE appointment_id = $1",
      [appointmentId]
    );

    const diagnosisText = "Atopic Dermatitis (Eczema)";
    const prescriptionText = "Hydrocortisone 1% cream - apply twice daily for 5 days.\nMoisturizer cream - apply frequently.";

    if (reportRes.rows.length > 0) {
      console.log("Report already exists for this case. Case is already finished.");
    } else {
      const reportId = uuidv4();
      await pool.query(
        `INSERT INTO report (report_id, appointment_id, patient_id, medical_syndicate_id_card, diagnosis, prescription, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'Keep skin hydrated. Avoid scratching.', $7)`,
        [reportId, appointmentId, patient.patient_id, doctor.medical_syndicate_id_card, diagnosisText, prescriptionText, pastDate]
      );
      console.log("Created report / case review.");

      // Add chat messages to make history look real
      const msg1Id = uuidv4();
      const msg2Id = uuidv4();
      const systemMsgId = uuidv4();

      const time1 = new Date(pastDate.getTime() + 10 * 60 * 1000);
      const time2 = new Date(pastDate.getTime() + 20 * 60 * 1000);

      await pool.query(
        `INSERT INTO chat_message (message_id, chat_id, sender_role, sender_id, message_text, message_type, sent_at)
         VALUES ($1, $2, 'patient', $3, 'Hello doctor, can you please review my skin analysis results?', 'text', $4)`,
        [msg1Id, chatId, patient.patient_id, time1]
      );

      await pool.query(
        `INSERT INTO chat_message (message_id, chat_id, sender_role, sender_id, message_text, message_type, sent_at)
         VALUES ($1, $2, 'doctor', $3, 'Hello! I have reviewed your scan. I will write down your diagnosis and prescription shortly.', 'text', $4)`,
        [msg2Id, chatId, doctor.medical_syndicate_id_card, time2]
      );

      const reportNotifyText = `📋 Report submitted:\n\n${diagnosisText}`;
      await pool.query(
        `INSERT INTO chat_message (message_id, chat_id, sender_role, sender_id, message_text, message_type, sent_at)
         VALUES ($1, $2, 'system', $3, $4, 'system', $5)`,
        [systemMsgId, chatId, doctor.medical_syndicate_id_card, reportNotifyText, time2]
      );
      console.log("Sent case report notifications to chat.");
    }

    await pool.query("COMMIT");
    console.log("Case assignment successfully committed!");

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Transaction failed, rolled back changes:", err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

assignCase();
