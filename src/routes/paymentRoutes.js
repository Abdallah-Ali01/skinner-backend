const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

/**
 * @swagger
 * tags:
 *   name: Payment
 *   description: Payment APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PayAppointmentRequest:
 *       type: object
 *       required:
 *         - appointment_id
 *         - method
 *         - card_holder_name
 *         - card_last4
 *       properties:
 *         appointment_id:
 *           type: string
 *           example: 11111111-1111-1111-1111-111111111111
 *         method:
 *           type: string
 *           example: card
 *         card_holder_name:
 *           type: string
 *           example: Abdallah Tako
 *         card_last4:
 *           type: string
 *           example: "1234"
 */

/**
 * @swagger
 * /api/payment/pay:
 *   post:
 *     summary: Pay for an appointment (creates a chat room between patient and doctor)
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PayAppointmentRequest'
 *     responses:
 *       201:
 *         description: Payment completed — returns chat_id for messaging
 *       403:
 *         description: Appointment does not belong to this user
 *       500:
 *         description: Server error
 */
router.post("/pay", verifyToken, allowRoles("patient"), paymentController.payAppointment);

/**
 * @swagger
 * /api/payment/appointment/{appointmentId}:
 *   get:
 *     summary: Get payment by appointment ID (ownership verified)
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details (includes chat_id)
 *       403:
 *         description: Access denied
 */
router.get("/appointment/:appointmentId", verifyToken, allowRoles("patient", "doctor", "admin"), paymentController.getPaymentByAppointmentId);

/**
 * @swagger
 * /api/payment/my:
 *   get:
 *     summary: Get all payments for the logged-in patient
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patient payments
 */
router.get("/my", verifyToken, allowRoles("patient"), paymentController.getMyPayments);

module.exports = router;