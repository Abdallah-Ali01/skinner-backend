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
    throw new Error("appointment_id, method, card_holder_name, card_last4, and amount are required");
  }

  const appointmentCheck = await pool.query(
    `SELECT * FROM appointment WHERE appointment_id = $1`,
    [appointment_id]
  );

  if (appointmentCheck.rows.length === 0) {
    throw new Error("Appointment not found");
  }

  const existingPayment = await pool.query(
    `SELECT * FROM payment WHERE appointment_id = $1`,
    [appointment_id]
  );

  if (existingPayment.rows.length > 0) {
    throw new Error("Payment already exists for this appointment");
  }

  const paymentId = uuidv4();
  const transactionReference = `TXN-${Date.now()}`;

  await pool.query(
    `
    INSERT INTO payment
    (
      payment_id,
      appointment_id,
      method,
      card_holder_name,
      card_last4,
      transaction_reference,
      transaction_date,
      payment_status,
      amount,
      otp_verified
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `,
    [
      paymentId,
      appointment_id,
      method,
      card_holder_name,
      card_last4,
      transactionReference,
      new Date(),
      "paid",
      amount,
      true
    ]
  );

  await pool.query(
    `
    UPDATE appointment
    SET status = $1
    WHERE appointment_id = $2
    `,
    ["confirmed", appointment_id]
  );

  return {
    success: true,
    message: "Payment completed successfully",
    data: {
      payment_id: paymentId,
      appointment_id,
      payment_status: "paid",
      transaction_reference: transactionReference
    }
  };
};

exports.getPaymentByAppointmentId = async (appointmentId) => {
  const result = await pool.query(
    `
    SELECT *
    FROM payment
    WHERE appointment_id = $1
    `,
    [appointmentId]
  );

  if (result.rows.length === 0) {
    throw new Error("Payment not found for this appointment");
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
      a.status AS appointment_status
    FROM payment p
    JOIN appointment a
      ON p.appointment_id = a.appointment_id
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