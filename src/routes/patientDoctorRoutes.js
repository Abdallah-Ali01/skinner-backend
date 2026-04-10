const express = require("express");
const router = express.Router();
const patientDoctorController = require("../controllers/patientDoctorController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

/**
 * @swagger
 * tags:
 *   name: Doctors (Patient View)
 *   description: Browse approved doctors (patient-facing)
 */

/**
 * @swagger
 * /api/doctors:
 *   get:
 *     summary: List all approved doctors for patients to browse
 *     tags: [Doctors (Patient View)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *         description: Filter by specialization (e.g. Dermatology)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by doctor name (partial match)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [rating, experience, fee_asc, fee_desc]
 *         description: Sort order (default is rating + experience)
 *     responses:
 *       200:
 *         description: List of approved doctors with public profile info
 */
router.get(
  "/",
  verifyToken,
  allowRoles("patient"),
  patientDoctorController.listDoctors
);

const availabilityController = require("../controllers/availabilityController");

/**
 * @swagger
 * /api/doctors/{doctorId}/available-dates:
 *   get:
 *     summary: Get available dates for a doctor (next N days)
 *     tags: [Doctors (Patient View)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *         example: DOC-2001
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to look ahead (default 7)
 *     responses:
 *       200:
 *         description: List of dates the doctor is available
 */
router.get(
  "/:doctorId/available-dates",
  verifyToken,
  allowRoles("patient"),
  availabilityController.getAvailableDates
);

/**
 * @swagger
 * /api/doctors/{doctorId}/available-slots:
 *   get:
 *     summary: Get time slots for a doctor on a specific date
 *     tags: [Doctors (Patient View)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *         example: DOC-2001
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check (YYYY-MM-DD)
 *         example: "2026-02-07"
 *     responses:
 *       200:
 *         description: Time slots with status (available/reserved/unavailable)
 */
router.get(
  "/:doctorId/available-slots",
  verifyToken,
  allowRoles("patient"),
  availabilityController.getAvailableSlots
);

/**
 * @swagger
 * /api/doctors/{doctorId}:
 *   get:
 *     summary: Get a single doctor's public profile
 *     tags: [Doctors (Patient View)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor's medical_syndicate_id_card
 *         example: DOC-2001
 *     responses:
 *       200:
 *         description: Doctor profile details
 *       404:
 *         description: Doctor not found or not approved
 */
router.get(
  "/:doctorId",
  verifyToken,
  allowRoles("patient"),
  patientDoctorController.getDoctorById
);

module.exports = router;
