const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const chatService = {
  // Check if user has access to this chat (must be the patient or doctor on the chat)
  async checkAccess(chatId, userId, role) {
    let query;
    if (role === "patient") {
      query = `SELECT chat_id FROM chat WHERE chat_id = $1 AND patient_id = $2`;
    } else if (role === "doctor") {
      query = `SELECT chat_id FROM chat WHERE chat_id = $1 AND medical_syndicate_id_card = $2`;
    } else {
      return { allowed: false };
    }

    const result = await pool.query(query, [chatId, userId]);
    return { allowed: result.rows.length > 0 };
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
  }
};

module.exports = chatService;