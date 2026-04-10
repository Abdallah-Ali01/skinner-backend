const express = require("express");
const router = express.Router();
const chatbotController = require("../controllers/chatbotController");
const { verifyToken } = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Chatbot
 *   description: AI dermatology chatbot (RAG-based)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ChatbotSendRequest:
 *       type: object
 *       required:
 *         - query
 *       properties:
 *         query:
 *           type: string
 *           example: "What is eczema and how is it treated?"
 *         conversation_id:
 *           type: string
 *           description: Provide to continue an existing conversation. Omit to start a new one.
 *           example: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *
 *     ChatbotSendResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             conversation_id:
 *               type: string
 *             answer:
 *               type: string
 *             sources:
 *               type: array
 *               items:
 *                 type: object
 */

/**
 * @swagger
 * /api/chatbot/send:
 *   post:
 *     summary: Send a message to the AI chatbot
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatbotSendRequest'
 *     responses:
 *       200:
 *         description: AI response with answer and sources
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatbotSendResponse'
 *       401:
 *         description: Unauthorized
 *       503:
 *         description: Chatbot service unavailable
 */
router.post("/send", verifyToken, chatbotController.sendMessage);

/**
 * @swagger
 * /api/chatbot/conversations:
 *   get:
 *     summary: Get all chatbot conversations for the logged-in user
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 *       401:
 *         description: Unauthorized
 */
router.get("/conversations", verifyToken, chatbotController.getConversations);

/**
 * @swagger
 * /api/chatbot/conversations/{conversationId}:
 *   get:
 *     summary: Get all messages in a conversation
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation messages
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.get(
  "/conversations/:conversationId",
  verifyToken,
  chatbotController.getConversationMessages
);

/**
 * @swagger
 * /api/chatbot/conversations/{conversationId}:
 *   delete:
 *     summary: Delete a conversation and all its messages
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.delete(
  "/conversations/:conversationId",
  verifyToken,
  chatbotController.deleteConversation
);

module.exports = router;
