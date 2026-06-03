const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const chatService = {
  // Check if user has access to this chat (must be the patient or doctor on the chat)
  // Also returns chat status ('active' or 'locked')
  async checkAccess(chatId, userId, role) {
    let query;
    if (role === "patient") {
      query = `SELECT chat_id, status FROM chat WHERE chat_id = $1 AND patient_id = $2`;
    } else if (role === "doctor") {
      query = `SELECT chat_id, status FROM chat WHERE chat_id = $1 AND medical_syndicate_id_card = $2`;
    } else {
      return { allowed: false };
    }

    const result = await pool.query(query, [chatId, userId]);
    if (result.rows.length === 0) return { allowed: false };
    return { allowed: true, status: result.rows[0].status };
  },

  // Get chat info + status for a specific chat
  async getChatStatus(chatId) {
    const result = await pool.query(
      `SELECT chat_id, status, patient_id, medical_syndicate_id_card, appointment_id, updated_at
       FROM chat WHERE chat_id = $1`,
      [chatId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  },

  // List all chats for a user with doctor/patient name and last message preview
  async getMyChats(userId, role) {
    let query;

    if (role === "patient") {
      query = `
        SELECT
          c.chat_id,
          c.status,
          c.medical_syndicate_id_card,
          c.updated_at,
          d.name AS doctor_name,
          d.specialization,
          (
            SELECT COUNT(*)::integer
            FROM chat_message cm2
            WHERE cm2.chat_id = c.chat_id
              AND cm2.sender_role != 'patient'
              AND cm2.is_read = FALSE
          ) AS unread_count,
          (
            SELECT json_build_object(
              'message_text', cm.message_text,
              'message_type', cm.message_type,
              'sender_role', cm.sender_role,
              'sent_at', cm.sent_at
            )
            FROM chat_message cm
            WHERE cm.chat_id = c.chat_id
            ORDER BY cm.sent_at DESC
            LIMIT 1
          ) AS last_message,
          (
            SELECT r.diagnosis
            FROM report r
            WHERE r.patient_id = c.patient_id
              AND r.medical_syndicate_id_card = c.medical_syndicate_id_card
            ORDER BY r.created_at DESC
            LIMIT 1
          ) AS diagnosis
        FROM chat c
        JOIN doctor d ON c.medical_syndicate_id_card = d.medical_syndicate_id_card
        WHERE c.patient_id = $1
        ORDER BY c.updated_at DESC`;
    } else if (role === "doctor") {
      query = `
        SELECT
          c.chat_id,
          c.status,
          c.patient_id,
          c.updated_at,
          p.name AS patient_name,
          p.email AS patient_email,
          (
            SELECT COUNT(*)::integer
            FROM chat_message cm2
            WHERE cm2.chat_id = c.chat_id
              AND cm2.sender_role != 'doctor'
              AND cm2.is_read = FALSE
          ) AS unread_count,
          (
            SELECT json_build_object(
              'message_text', cm.message_text,
              'message_type', cm.message_type,
              'sender_role', cm.sender_role,
              'sent_at', cm.sent_at
            )
            FROM chat_message cm
            WHERE cm.chat_id = c.chat_id
            ORDER BY cm.sent_at DESC
            LIMIT 1
          ) AS last_message,
          (
            SELECT r.diagnosis
            FROM report r
            WHERE r.patient_id = c.patient_id
              AND r.medical_syndicate_id_card = c.medical_syndicate_id_card
            ORDER BY r.created_at DESC
            LIMIT 1
          ) AS diagnosis
        FROM chat c
        JOIN patient p ON c.patient_id = p.patient_id
        WHERE c.medical_syndicate_id_card = $1
        ORDER BY c.updated_at DESC`;
    } else {
      return { success: false, data: [] };
    }

    const result = await pool.query(query, [userId]);
    return {
      success: true,
      count: result.rows.length,
      data: result.rows
    };
  },

  async saveMessage({ chat_id, sender_id, sender_role, message_text, message_type = 'text', file_url = null, original_filename = null }) {
    const messageId = uuidv4();
    const result = await pool.query(
      `INSERT INTO chat_message (message_id, chat_id, sender_role, sender_id, message_text, message_type, file_url, original_filename, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [messageId, chat_id, sender_role, String(sender_id), message_text, message_type, file_url, original_filename]
    );
    return result.rows[0];
  },

  async getMessagesByChatId(chatId) {
    const result = await pool.query(
      `SELECT * FROM chat_message WHERE chat_id = $1 ORDER BY sent_at ASC`,
      [chatId]
    );
    return result.rows;
  },

  async markChatAsRead(chatId, userRole) {
    if (userRole === "doctor") {
      await pool.query(
        `UPDATE chat_message 
         SET is_read = TRUE 
         WHERE chat_id = $1 
           AND sender_role = 'patient' 
           AND is_read = FALSE`,
        [chatId]
      );
    } else if (userRole === "patient") {
      await pool.query(
        `UPDATE chat_message 
         SET is_read = TRUE 
         WHERE chat_id = $1 
           AND (sender_role = 'doctor' OR sender_role = 'system') 
           AND is_read = FALSE`,
        [chatId]
      );
    }
  }
};

module.exports = chatService;