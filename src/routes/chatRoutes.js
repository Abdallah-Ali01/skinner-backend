const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");
const upload = require("../middlewares/uploadMiddleware");

/**
 * @swagger
 * /api/chat/my-chats:
 *   get:
 *     summary: Get all chat channels for the logged-in user
 *     description: >
 *       Returns all persistent 1-to-1 chat channels.
 *       Each channel includes status (active/locked), the other party's name, and a last message preview.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of chat channels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       chat_id:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [active, locked]
 *                       doctor_name:
 *                         type: string
 *                       last_message:
 *                         type: object
 *       500:
 *         description: Server error
 */
router.get(
  "/my-chats",
  verifyToken,
  allowRoles("patient", "doctor"),
  chatController.getMyChats
);

/**
 * @swagger
 * /api/chat/access/{chatId}:
 *   get:
 *     summary: Check chat access and status (patient or doctor)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Access result with chat status (active/locked)
 *       403:
 *         description: Forbidden - No access to this chat
 *       500:
 *         description: Server error
 */
router.get(
  "/access/:chatId",
  verifyToken,
  allowRoles("patient", "doctor"),
  chatController.checkChatAccess
);

/**
 * @swagger
 * /api/chat/send:
 *   post:
 *     summary: Send a chat message (Text or File)
 *     description: >
 *       Sends a message to a chat channel. Will be rejected with 403 if the chat is locked.
 *       Chat becomes locked after the doctor submits a report. Book a new appointment to reopen.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - chat_id
 *             properties:
 *               chat_id:
 *                 type: string
 *                 example: "92aaaa87-7c07-452f-91a7-7d22390097e6"
 *               message_text:
 *                 type: string
 *                 example: "Hello doctor, please check the file."
 *               chat_file:
 *                 type: string
 *                 format: binary
 *                 description: Upload an image (JPG/PNG) or a PDF (Max 5MB)
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       403:
 *         description: Forbidden - Chat is locked or access denied
 *       500:
 *         description: Server error
 */
router.post(
  "/send",
  verifyToken,
  allowRoles("patient", "doctor"),
  upload.single("chat_file"),
  chatController.sendMessage
);

/**
 * @swagger
 * /api/chat/messages/{chatId}:
 *   get:
 *     summary: Get all messages for a chat (authorized)
 *     description: >
 *       Returns all messages including system messages (auto-generated report summaries).
 *       Response includes chat_status so the frontend knows if messaging is enabled.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of chat messages with chat_status field
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
router.get(
  "/messages/:chatId",
  verifyToken,
  allowRoles("patient", "doctor"),
  chatController.getMessagesByChatId
);

module.exports = router;