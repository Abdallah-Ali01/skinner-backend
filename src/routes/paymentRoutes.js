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
 *         - amount
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
 *         amount:
 *           type: number
 *           example: 300
 */

/**
 * @swagger
 * /api/payment/pay:
 *   post:
 *     summary: Pay for an appointment
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
 *         description: Payment completed successfully
 *       500:
 *         description: Server error
 */
router.post("/pay", verifyToken, allowRoles("patient"), paymentController.payAppointment);

/**
 * @swagger
 * /api/payment/appointment/{appointmentId}:
 *   get:
 *     summary: Get payment by appointment ID
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         example: 11111111-1111-1111-1111-111111111111
 *     responses:
 *       200:
 *         description: Payment details
 */
router.get("/appointment/:appointmentId", verifyToken, allowRoles("patient", "doctor", "admin"), paymentController.getPaymentByAppointmentId);

/**
 * @swagger
 * /api/payment/patient/{patientId}:
 *   get:
 *     summary: Get all payments for a patient
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         example: fd3d3430-d8f0-49a6-958d-9739dd379dd1
 *     responses:
 *       200:
 *         description: Patient payments
 */
router.get("/patient/:patientId", verifyToken, allowRoles("patient", "admin"), paymentController.getPatientPayments);

module.exports = router;