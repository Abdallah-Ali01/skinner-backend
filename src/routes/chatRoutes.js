const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");
const upload = require("../middlewares/uploadMiddleware");

/**
 * @swagger
 * /api/chat/access/{chatId}:
 *   get:
 *     summary: Check chat access (patient or doctor)
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
 *         description: Access result successfully retrieved
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
 *         description: Forbidden - Payment required
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
 *         description: List of chat messages
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