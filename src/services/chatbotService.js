const axios = require("axios");
const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const CHATBOT_URL = process.env.CHATBOT_SERVICE_URL || "http://127.0.0.1:8001";

/**
 * Send a message to the AI chatbot.
 * - Loads the user's conversation history from the DB
 * - Forwards query + history to the Python RAG service
 * - Saves both the user message and the AI response
 */
exports.sendMessage = async ({ userId, role, query, conversationId }) => {
  if (!query) {
    const err = new Error("query is required");
    err.status = 400;
    throw err;
  }

  // Resolve or create a conversation
  let convId = conversationId;

  if (!convId) {
    // Create a new conversation
    convId = uuidv4();
    await pool.query(
      `INSERT INTO chatbot_conversation (conversation_id, user_id, user_role, title)
       VALUES ($1, $2, $3, $4)`,
      [convId, userId, role, query.substring(0, 100)]
    );
  } else {
    // Verify ownership
    const check = await pool.query(
      `SELECT 1 FROM chatbot_conversation
       WHERE conversation_id = $1 AND user_id = $2`,
      [convId, userId]
    );
    if (check.rows.length === 0) {
      const err = new Error("Conversation not found");
      err.status = 404;
      throw err;
    }
  }

  // Load existing messages for this conversation (to send as chat_history)
  const historyResult = await pool.query(
    `SELECT sender AS role, message_text AS content
     FROM chatbot_message
     WHERE conversation_id = $1
     ORDER BY created_at ASC`,
    [convId]
  );

  const chatHistory = historyResult.rows.map((row) => ({
    role: row.role === "user" ? "user" : "assistant",
    content: row.content,
  }));

  // Save the user's message
  await pool.query(
    `INSERT INTO chatbot_message (message_id, conversation_id, sender, message_text)
     VALUES ($1, $2, 'user', $3)`,
    [uuidv4(), convId, query]
  );

  // Call the Python chatbot service
  let aiAnswer;
  let sources = [];

  try {
    const response = await axios.post(
      `${CHATBOT_URL}/api/v1/chat`,
      {
        query,
        chat_history: chatHistory,
      },
      { timeout: 30000 }
    );

    aiAnswer = response.data.answer;
    sources = response.data.sources || [];
  } catch (error) {
    if (error.response) {
      const err = new Error(
        error.response.data?.detail || "Chatbot service error"
      );
      err.status = error.response.status;
      throw err;
    }
    const err = new Error("Chatbot service is unavailable");
    err.status = 503;
    throw err;
  }

  // Save the AI response
  await pool.query(
    `INSERT INTO chatbot_message (message_id, conversation_id, sender, message_text)
     VALUES ($1, $2, 'assistant', $3)`,
    [uuidv4(), convId, aiAnswer]
  );

  // Update conversation timestamp
  await pool.query(
    `UPDATE chatbot_conversation SET updated_at = NOW() WHERE conversation_id = $1`,
    [convId]
  );

  return {
    success: true,
    data: {
      conversation_id: convId,
      answer: aiAnswer,
      sources,
    },
  };
};

/**
 * Get all conversations for a user
 */
exports.getConversations = async ({ userId }) => {
  const result = await pool.query(
    `SELECT conversation_id, title, created_at, updated_at
     FROM chatbot_conversation
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [userId]
  );

  return {
    success: true,
    data: result.rows,
  };
};

/**
 * Get messages for a specific conversation
 */
exports.getConversationMessages = async ({ userId, conversationId }) => {
  // Verify ownership
  const check = await pool.query(
    `SELECT 1 FROM chatbot_conversation
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );

  if (check.rows.length === 0) {
    const err = new Error("Conversation not found");
    err.status = 404;
    throw err;
  }

  const result = await pool.query(
    `SELECT message_id, sender, message_text, created_at
     FROM chatbot_message
     WHERE conversation_id = $1
     ORDER BY created_at ASC`,
    [conversationId]
  );

  return {
    success: true,
    data: result.rows,
  };
};

/**
 * Delete a conversation and all its messages
 */
exports.deleteConversation = async ({ userId, conversationId }) => {
  const check = await pool.query(
    `SELECT 1 FROM chatbot_conversation
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );

  if (check.rows.length === 0) {
    const err = new Error("Conversation not found");
    err.status = 404;
    throw err;
  }

  await pool.query(
    `DELETE FROM chatbot_conversation WHERE conversation_id = $1`,
    [conversationId]
  );

  return {
    success: true,
    message: "Conversation deleted",
  };
};
