const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const chatService = {
  // المحرك الأساسي للتحقق من صلاحية الدفع والدخول
  async checkAccess(chatId, userId, role) {
    let query;
    if (role === "patient") {
      query = `
        SELECT a.appointment_id FROM appointment a
        JOIN payment p ON a.appointment_id = p.appointment_id
        WHERE a.chat_id = $1 AND a.patient_id = $2 AND p.payment_status = 'paid'
      `;
    } else if (role === "doctor") {
      query = `
        SELECT a.appointment_id FROM appointment a
        JOIN payment p ON a.appointment_id = p.appointment_id
        WHERE a.chat_id = $1 AND a.medical_syndicate_id_card = $2 AND p.payment_status = 'paid'
      `;
    } else {
      return { allowed: false };
    }

    const result = await pool.query(query, [chatId, userId]);
    return { allowed: result.rows.length > 0 };
  },

  // src/services/chatService.js
async saveMessage({ chat_id, sender_id, sender_role, message_text, message_type = 'text', original_filename = null }) {
  const messageId = uuidv4();
  const result = await pool.query(
    `INSERT INTO chat_message (message_id, chat_id, sender_role, sender_id, message_text, message_type, original_filename, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
    [messageId, chat_id, sender_role, String(sender_id), message_text, message_type, original_filename]
  );
  return result.rows[0];
},

  async getMessagesByChatId(chatId) {
    const result = await pool.query(
      `SELECT * FROM chat_message WHERE chat_id = $1 ORDER BY sent_at ASC`,
      [chatId]
    );
    return result.rows;
  }
};

module.exports = chatService;