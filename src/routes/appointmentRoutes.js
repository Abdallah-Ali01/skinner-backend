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
 *         - patient_id
 *         - medical_syndicate_id_card
 *         - doctor_name
 *         - total_cost
 *         - date
 *         - analysis_id
 *       properties:
 *         patient_id:
 *           type: string
 *           example: fd3d3430-d8f0-49a6-958d-9739dd379dd1
 *         medical_syndicate_id_card:
 *           type: string
 *           example: DOC-2001
 *         doctor_name:
 *           type: string
 *           example: Dr. Ahmed Ali
 *         total_cost:
 *           type: number
 *           example: 300
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
 * /api/appointment/patient/{patientId}:
 *   get:
 *     summary: Get all appointments for a patient
 *     tags: [Appointment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Patient appointments (includes chat_id if payment was made)
 */
router.get("/patient/:patientId", verifyToken, allowRoles("patient", "admin"), (req, res, next) => {
  if (req.user.role === "patient" && req.user.id !== req.params.patientId) {
    return res.status(403).json({ success: false, message: "Access denied" });
  }
  next();
}, appointmentController.getPatientAppointments);

/**
 * @swagger
 * /api/appointment/doctor/{doctorId}:
 *   get:
 *     summary: Get all appointments for a doctor
 *     tags: [Appointment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *         example: DOC-2001
 *     responses:
 *       200:
 *         description: Doctor appointments
 */
router.get("/doctor/:doctorId", verifyToken, allowRoles("doctor", "admin"), (req, res, next) => {
  if (req.user.role === "doctor" && req.user.id !== req.params.doctorId) {
    return res.status(403).json({ success: false, message: "Access denied" });
  }
  next();
}, appointmentController.getDoctorAppointments);

module.exports = router;