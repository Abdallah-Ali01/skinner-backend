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
 *         - medical_syndicate_id_card
 *       properties:
 *         appointment_id:
 *           type: string
 *           example: 92aaaa87-7c07-452f-91a7-7d22390097e6
 *         diagnosis:
 *           type: string
 *           example: Likely HFMD. Patient should follow up clinically.
 *         prescription:
 *           type: string
 *           example: Apply topical cream twice daily for 2 weeks
 *         notes:
 *           type: string
 *           example: Follow up in 2 weeks if no improvement
 *         medical_syndicate_id_card:
 *           type: string
 *           example: DOC-2001
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

module.exports = router;