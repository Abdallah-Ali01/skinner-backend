const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

/**
 * @swagger
 * tags:
 *   name: Appointment
 *   description: Appointment booking APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     BookAppointmentRequest:
 *       type: object
 *       required:
 *         - medical_syndicate_id_card
 *         - date
 *         - analysis_id
 *       properties:
 *         medical_syndicate_id_card:
 *           type: string
 *           example: DOC-2001
 *         date:
 *           type: string
 *           example: 2026-03-15T10:30:00.000Z
 *         analysis_id:
 *           type: string
 *           example: 92aaaa87-7c07-452f-91a7-7d22390097e6
 */

/**
 * @swagger
 * /api/appointment/book:
 *   post:
 *     summary: Book appointment with a doctor for a specific analysis
 *     tags: [Appointment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookAppointmentRequest'
 *     responses:
 *       201:
 *         description: Appointment booked successfully (status = pending_payment)
 *       500:
 *         description: Server error
 */
router.post("/book", verifyToken, allowRoles("patient"), appointmentController.bookAppointment);

/**
 * @swagger
 * /api/appointment/my:
 *   get:
 *     summary: Get all appointments for the logged-in user (patient or doctor)
 *     tags: [Appointment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User appointments (includes chat_id if payment was made)
 */
router.get("/my", verifyToken, allowRoles("patient", "doctor"), appointmentController.getMyAppointments);

/**
 * @swagger
 * /api/appointment/my-reports:
 *   get:
 *     summary: Get all doctor reports/advice for the logged-in patient
 *     tags: [Appointment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All reports with doctor diagnosis, prescription, and notes
 */
router.get("/my-reports", verifyToken, allowRoles("patient"), appointmentController.getMyReports);

/**
 * @swagger
 * /api/appointment/report/{appointmentId}:
 *   get:
 *     summary: Get a specific report by appointment ID (ownership verified)
 *     tags: [Appointment]
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
 *         description: Full report details (diagnosis, prescription, notes, analysis data)
 *       403:
 *         description: Access denied
 *       404:
 *         description: Report not found
 */
router.get("/report/:appointmentId", verifyToken, allowRoles("patient", "doctor", "admin"), appointmentController.getReportByAppointmentId);

module.exports = router;