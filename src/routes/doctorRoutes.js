const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

/**
 * @swagger
 * tags:
 *   name: Doctor
 *   description: Doctor dashboard APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ReviewCaseRequest:
 *       type: object
 *       required:
 *         - appointment_id
 *         - diagnosis
 *       properties:
 *         appointment_id:
 *           type: string
 *           example: 92aaaa87-7c07-452f-91a7-7d22390097e6
 *         diagnosis:
 *           type: string
 *           example: Likely HFMD. Patient should follow up clinically.
 */

/**
 * @swagger
 * /api/doctor/pending-cases:
 *   get:
 *     summary: Get pending paid cases for the logged-in doctor
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending cases (includes analysis data + chat_id)
 */
router.get("/pending-cases", verifyToken, allowRoles("doctor"), doctorController.getPendingCases);

/**
 * @swagger
 * /api/doctor/reviewed-cases:
 *   get:
 *     summary: Get reviewed cases for the logged-in doctor
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reviewed cases with reports
 */
router.get("/reviewed-cases", verifyToken, allowRoles("doctor"), doctorController.getReviewedCases);

/**
 * @swagger
 * /api/doctor/case/{appointmentId}:
 *   get:
 *     summary: Get case details by appointment ID
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         example: 92aaaa87-7c07-452f-91a7-7d22390097e6
 *     responses:
 *       200:
 *         description: Case details (analysis + patient + chat_id)
 *       404:
 *         description: Case not found
 */
router.get("/case/:appointmentId", verifyToken, allowRoles("doctor"), doctorController.getCaseDetails);

/**
 * @swagger
 * /api/doctor/review-case:
 *   post:
 *     summary: Review a case and create a report
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewCaseRequest'
 *     responses:
 *       201:
 *         description: Case reviewed successfully
 *       500:
 *         description: Server error
 */
router.post("/review-case", verifyToken, allowRoles("doctor"), doctorController.reviewCase);

/**
 * @swagger
 * /api/doctor/update-report:
 *   put:
 *     summary: Edit/update an existing doctor report
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewCaseRequest'
 *     responses:
 *       200:
 *         description: Report updated successfully
 *       404:
 *         description: Report not found or not authorized
 *       500:
 *         description: Server error
 */
router.put("/update-report", verifyToken, allowRoles("doctor"), doctorController.updateReport);

const availabilityController = require("../controllers/availabilityController");


/**
 * @swagger
 * /api/doctor/date-availability:
 *   put:
 *     summary: Set or replace time slots for a specific date
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - slots
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-03"
 *               slots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - start_time
 *                     - end_time
 *                   properties:
 *                     start_time:
 *                       type: string
 *                       example: "09:00"
 *                     end_time:
 *                       type: string
 *                       example: "09:30"
 *     responses:
 *       200:
 *         description: Date availability saved
 */
router.put("/date-availability", verifyToken, allowRoles("doctor"), availabilityController.setDateAvailability);

/**
 * @swagger
 * /api/doctor/date-availability:
 *   get:
 *     summary: Get the doctor's date-specific availability for a date range
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Date-specific availability entries
 */
router.get("/date-availability", verifyToken, allowRoles("doctor"), availabilityController.getDateAvailability);

/**
 * @swagger
 * /api/doctor/date-availability/{date}:
 *   delete:
 *     summary: Remove all availability for a specific date
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-06-03"
 *     responses:
 *       200:
 *         description: Date availability removed
 */
router.delete("/date-availability/:date", verifyToken, allowRoles("doctor"), availabilityController.removeDateAvailability);

module.exports = router;