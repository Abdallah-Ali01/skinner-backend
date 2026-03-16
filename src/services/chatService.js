const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

exports.checkPatientChatAccess = async (chatId, patientId) => {
  const result = await pool.query(
    `
    SELECT
      a.appointment_id,
      a.chat_id,
      a.patient_id,
      a.medical_syndicate_id_card,
      a.status AS appointment_status,
      p.payment_status
    FROM appointment a
    JOIN payment p
      ON a.appointment_id = p.appointment_id
    WHERE a.chat_id = $1
      AND a.patient_id = $2
      AND p.payment_status = 'paid'
    `,
    [chatId, patientId]
  );

  const hasAccess = result.rows.length > 0;

  return {
    success: true,
    has_access: hasAccess,
    role: "patient",
    data: hasAccess ? result.rows[0] : null
  };
};

exports.checkDoctorChatAccess = async (chatId, doctorId) => {
  const result = await pool.query(
    `
    SELECT
      a.appointment_id,
      a.chat_id,
      a.patient_id,
      a.medical_syndicate_id_card,
      a.status AS appointment_status,
      p.payment_status
    FROM appointment a
    JOIN payment p
      ON a.appointment_id = p.appointment_id
    WHERE a.chat_id = $1
      AND a.medical_syndicate_id_card = $2
      AND p.payment_status = 'paid'
    `,
    [chatId, doctorId]
  );

  const hasAccess = result.rows.length > 0;

  return {
    success: true,
    has_access: hasAccess,
    role: "doctor",
    data: hasAccess ? result.rows[0] : null
  };
};

exports.sendMessage = async (data) => {
  const {
    chat_id,
    sender_role,
    sender_id,
    message_text
  } = data;

  if (!chat_id || !sender_role || !sender_id || !message_text) {
    throw new Error("chat_id, sender_role, sender_id, and message_text are required");
  }

  if (!["patient", "doctor"].includes(sender_role)) {
    throw new Error("sender_role must be patient or doctor");
  }

  // check access before sending
  let accessResult;

  if (sender_role === "patient") {
    accessResult = await exports.checkPatientChatAccess(chat_id, sender_id);
  } else {
    accessResult = await exports.checkDoctorChatAccess(chat_id, sender_id);
  }

  if (!accessResult.has_access) {
    throw new Error("You are not allowed to send messages in this chat");
  }

  const messageId = uuidv4();

  await pool.query(
    `
    INSERT INTO chat_message
    (message_id, chat_id, sender_role, sender_id, message_text, sent_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      messageId,
      chat_id,
      sender_role,
      sender_id,
      message_text,
      new Date()
    ]
  );

  return {
    success: true,
    message: "Message sent successfully",
    data: {
      message_id: messageId,
      chat_id,
      sender_role,
      sender_id,
      message_text
    }
  };
};

exports.getMessagesByChatId = async (chatId) => {
  const result = await pool.query(
    `
    SELECT
      message_id,
      chat_id,
      sender_role,
      sender_id,
      message_text,
      sent_at
    FROM chat_message
    WHERE chat_id = $1
    ORDER BY sent_at ASC
    `,
    [chatId]
  );

  return {
    success: true,
    count: result.rows.length,
    data: result.rows
  };
};