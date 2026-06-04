const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

exports.payAppointment = async (patientId, data) => {
  const {
    appointment_id,
    method,
    card_holder_name,
    card_last4
  } = data;

  if (!appointment_id || !method || !card_holder_name || !card_last4) {
    const err = new Error("appointment_id, method, card_holder_name, and card_last4 are required");
    err.status = 400;
    throw err;
  }

  // Get appointment details — amount comes from total_cost (set from doctor's consultation_fee)
  const appointmentResult = await pool.query(
    `SELECT appointment_id, patient_id, medical_syndicate_id_card, status, total_cost, analysis_id
     FROM appointment WHERE appointment_id = $1`,
    [appointment_id]
  );

  if (appointmentResult.rows.length === 0) {
    const err = new Error("Appointment not found");
    err.status = 404;
    throw err;
  }

  const appointment = appointmentResult.rows[0];
  const amount = appointment.total_cost;

  if (appointment.patient_id !== patientId) {
    const err = new Error("This appointment does not belong to you");
    err.status = 403;
    throw err;
  }

  if (appointment.status !== "pending_payment") {
    const err = new Error("Appointment is not in pending_payment status");
    err.status = 400;
    throw err;
  }

  const existingPayment = await pool.query(
    `SELECT 1 FROM payment WHERE appointment_id = $1`,
    [appointment_id]
  );

  if (existingPayment.rows.length > 0) {
    const err = new Error("Payment already exists for this appointment");
    err.status = 409;
    throw err;
  }

  const paymentId = uuidv4();
  const transactionReference = `TXN-${Date.now()}`;

  // Insert payment — amount is from appointment.total_cost, NOT from client
  await pool.query(
    `
    INSERT INTO payment
    (payment_id, appointment_id, method, card_holder_name, card_last4, transaction_reference, transaction_date, payment_status, amount, otp_verified)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [paymentId, appointment_id, method, card_holder_name, card_last4, transactionReference, new Date(), "paid", amount, true]
  );

  // Update appointment status to confirmed
  await pool.query(
    `UPDATE appointment SET status = 'confirmed' WHERE appointment_id = $1`,
    [appointment_id]
  );

  // Find or create chat — reuse existing channel for same doctor+patient pair
  const existingChat = await pool.query(
    `SELECT chat_id FROM chat WHERE patient_id = $1 AND medical_syndicate_id_card = $2`,
    [appointment.patient_id, appointment.medical_syndicate_id_card]
  );

  let chatId;
  if (existingChat.rows.length > 0) {
    // Reactivate existing chat channel
    chatId = existingChat.rows[0].chat_id;
    await pool.query(
      `UPDATE chat SET status = 'active', appointment_id = $1, updated_at = NOW() WHERE chat_id = $2`,
      [appointment_id, chatId]
    );
  } else {
    // Create new chat channel
    chatId = uuidv4();
    await pool.query(
      `INSERT INTO chat (chat_id, appointment_id, patient_id, medical_syndicate_id_card, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())`,
      [chatId, appointment_id, appointment.patient_id, appointment.medical_syndicate_id_card]
    );
  }

  // --- Auto-Sent Enhanced Analysis Message & Scan ---
  try {
    const detailsResult = await pool.query(
      `SELECT 
         p.age, p.gender, 
         an.skin_image_upload, an.analysis, an.skin_disease_classification, an.created_at
       FROM appointment a
       JOIN patient p ON a.patient_id = p.patient_id
       JOIN analysis an ON a.analysis_id = an.analysis_id
       WHERE a.appointment_id = $1`,
      [appointment_id]
    );

    if (detailsResult.rows.length > 0) {
      const details = detailsResult.rows[0];
      const imageUpload = details.skin_image_upload;

      if (imageUpload) {
        // Prevent duplicate system messages for the same appointment
        const duplicateCheck = await pool.query(
          `SELECT 1 FROM chat_message 
           WHERE chat_id = $1 
             AND sender_role = 'system' 
             AND original_filename = 'skin_analysis.jpg'
             AND message_text LIKE '%Appointment: ' || $2 || '%'
           LIMIT 1`,
          [chatId, appointment_id]
        );

        if (duplicateCheck.rows.length === 0) {
          const patientAge = details.age || "N/A";
          const patientGender = details.gender ? (details.gender.charAt(0).toUpperCase() + details.gender.slice(1)) : "N/A";
          const classification = details.skin_disease_classification || "N/A";

          // Parse confidence score
          const analysisText = details.analysis || "";
          let confidencePercent = "N/A";
          const match = /Confidence\s*:\s*([0-9.]+)/i.exec(analysisText);
          if (match) {
            const confFloat = parseFloat(match[1]);
            const pct = Math.round(confFloat <= 1 ? confFloat * 100 : confFloat);
            confidencePercent = `${pct}%`;
          }

          // Build structured key-value text for the premium Clinical Summary Card
          const autoText = `📋 CLINICAL SUMMARY CARD\n` +
            `Appointment: ${appointment_id}\n` +
            `Patient: ${patientGender}, ${patientAge}\n` +
            `AI Prediction: ${classification}\n` +
            `Confidence: ${confidencePercent}\n` +
            `Analysis Date: ${new Date(details.created_at || Date.now()).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}\n` +
            `Scan URL: ${imageUpload}`;
          
          const autoMessageId = uuidv4();
          await pool.query(
            `INSERT INTO chat_message 
             (message_id, chat_id, sender_role, sender_id, message_text, message_type, file_url, original_filename, sent_at)
             VALUES ($1, $2, 'system', $3, $4, 'image', $5, 'skin_analysis.jpg', NOW())`,
            [
              autoMessageId, 
              chatId, 
              'system', 
              appointment.medical_syndicate_id_card, 
              autoText, 
              imageUpload
            ]
          );
        }
      }
    }
  } catch (err) {
    console.error("Failed to automatically send analysis scan to chat:", err.message);
  }

  return {
    success: true,
    message: "Payment completed successfully. Chat room created.",
    data: {
      payment_id: paymentId,
      appointment_id,
      payment_status: "paid",
      transaction_reference: transactionReference,
      chat_id: chatId,
      medical_syndicate_id_card: appointment.medical_syndicate_id_card
    }
  };
};

exports.getPaymentByAppointmentId = async (appointmentId, user) => {
  const result = await pool.query(
    `
    SELECT p.*, c.chat_id, c.status AS chat_status, a.patient_id, a.medical_syndicate_id_card
    FROM payment p
    JOIN appointment a ON p.appointment_id = a.appointment_id
    LEFT JOIN chat c ON a.patient_id = c.patient_id
      AND a.medical_syndicate_id_card = c.medical_syndicate_id_card
    WHERE p.appointment_id = $1
    `,
    [appointmentId]
  );

  if (result.rows.length === 0) {
    const err = new Error("Payment not found for this appointment");
    err.status = 404;
    throw err;
  }

  const payment = result.rows[0];

  // Ownership check: patient can see own, doctor can see assigned, admin can see all
  if (user.role === "patient" && payment.patient_id !== user.id) {
    const err = new Error("Access denied");
    err.status = 403;
    throw err;
  }
  if (user.role === "doctor" && payment.medical_syndicate_id_card !== user.id) {
    const err = new Error("Access denied");
    err.status = 403;
    throw err;
  }

  return {
    success: true,
    data: payment
  };
};

exports.getPatientPayments = async (patientId) => {
  const result = await pool.query(
    `
    SELECT
      p.payment_id,
      p.appointment_id,
      p.method,
      p.card_holder_name,
      p.card_last4,
      p.transaction_reference,
      p.transaction_date,
      p.payment_status,
      p.amount,
      a.patient_id,
      a.doctor_name,
      a.date AS appointment_date,
      a.status AS appointment_status,
      c.chat_id, c.status AS chat_status
    FROM payment p
    JOIN appointment a ON p.appointment_id = a.appointment_id
    LEFT JOIN chat c ON a.patient_id = c.patient_id
      AND a.medical_syndicate_id_card = c.medical_syndicate_id_card
    WHERE a.patient_id = $1
    ORDER BY p.transaction_date DESC
    `,
    [patientId]
  );

  return {
    success: true,
    count: result.rows.length,
    data: result.rows
  };
};