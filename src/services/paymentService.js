const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

exports.payAppointment = async (data) => {
  const {
    appointment_id,
    method,
    card_holder_name,
    card_last4,
    amount
  } = data;

  if (!appointment_id || !method || !card_holder_name || !card_last4 || !amount) {
    const err = new Error("appointment_id, method, card_holder_name, card_last4, and amount are required");
    err.status = 400;
    throw err;
  }

  // Get appointment details (need patient_id and doctor_id for chat creation)
  const appointmentResult = await pool.query(
    `SELECT appointment_id, patient_id, medical_syndicate_id_card, status
     FROM appointment WHERE appointment_id = $1`,
    [appointment_id]
  );

  if (appointmentResult.rows.length === 0) {
    const err = new Error("Appointment not found");
    err.status = 404;
    throw err;
  }

  const appointment = appointmentResult.rows[0];

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
  const chatId = uuidv4();
  const transactionReference = `TXN-${Date.now()}`;

  // Insert payment
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

  // Create chat room between patient and doctor
  await pool.query(
    `
    INSERT INTO chat (chat_id, appointment_id, patient_id, medical_syndicate_id_card, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    `,
    [chatId, appointment_id, appointment.patient_id, appointment.medical_syndicate_id_card]
  );

  return {
    success: true,
    message: "Payment completed successfully. Chat room created.",
    data: {
      payment_id: paymentId,
      appointment_id,
      payment_status: "paid",
      transaction_reference: transactionReference,
      chat_id: chatId
    }
  };
};

exports.getPaymentByAppointmentId = async (appointmentId) => {
  const result = await pool.query(
    `
    SELECT p.*, c.chat_id
    FROM payment p
    LEFT JOIN chat c ON p.appointment_id = c.appointment_id
    WHERE p.appointment_id = $1
    `,
    [appointmentId]
  );

  if (result.rows.length === 0) {
    const err = new Error("Payment not found for this appointment");
    err.status = 404;
    throw err;
  }

  return {
    success: true,
    data: result.rows[0]
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
      c.chat_id
    FROM payment p
    JOIN appointment a ON p.appointment_id = a.appointment_id
    LEFT JOIN chat c ON a.appointment_id = c.appointment_id
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