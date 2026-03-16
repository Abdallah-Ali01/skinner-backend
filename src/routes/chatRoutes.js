const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chat and messages APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SendMessageRequest:
 *       type: object
 *       required:
 *         - chat_id
 *         - sender_role
 *         - sender_id
 *         - message_text
 *       properties:
 *         chat_id:
 *           type: string
 *           example: 92aaaa87-7c07-452f-91a7-7d22390097e6
 *         sender_role:
 *           type: string
 *           example: patient
 *         sender_id:
 *           type: string
 *           example: fd3d3430-d8f0-49a6-958d-9739dd379dd1
 *         message_text:
 *           type: string
 *           example: Hello doctor, I need help with my case.
 */

/**
 * @swagger
 * /api/chat/access/patient/{chatId}/{patientId}:
 *   get:
 *     summary: Check patient access to a paid chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Patient access result
 */
router.get("/access/patient/:chatId/:patientId", verifyToken, allowRoles("patient"), chatController.checkPatientChatAccess);

/**
 * @swagger
 * /api/chat/access/doctor/{chatId}/{doctorId}:
 *   get:
 *     summary: Check doctor access to a paid chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Doctor access result
 */
router.get("/access/doctor/:chatId/:doctorId", verifyToken, allowRoles("doctor"), chatController.checkDoctorChatAccess);

/**
 * @swagger
 * /api/chat/send:
 *   post:
 *     summary: Send a chat message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendMessageRequest'
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
router.post("/send", verifyToken, allowRoles("patient", "doctor"), chatController.sendMessage);

/**
 * @swagger
 * /api/chat/messages/{chatId}:
 *   get:
 *     summary: Get all messages for a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         example: 92aaaa87-7c07-452f-91a7-7d22390097e6
 *     responses:
 *       200:
 *         description: Chat messages
 */
router.get("/messages/:chatId", verifyToken, allowRoles("patient", "doctor"), chatController.getMessagesByChatId);

module.exports = router;