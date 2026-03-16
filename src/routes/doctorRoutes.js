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
 *         - chat_id
 *         - doctor_name
 *         - diagnosis
 *         - medical_syndicate_id_card
 *       properties:
 *         chat_id:
 *           type: string
 *           example: 92aaaa87-7c07-452f-91a7-7d22390097e6
 *         doctor_name:
 *           type: string
 *           example: Dr. Ahmed Ali
 *         diagnosis:
 *           type: string
 *           example: Likely HFMD. Patient should follow up clinically.
 *         medical_syndicate_id_card:
 *           type: string
 *           example: DOC-2001
 */

/**
 * @swagger
 * /api/doctor/pending-cases:
 *   get:
 *     summary: Get pending paid cases for a doctor
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: doctor_id
 *         required: true
 *         schema:
 *           type: string
 *         example: DOC-2001
 *     responses:
 *       200:
 *         description: Pending cases
 */
router.get("/pending-cases", verifyToken, allowRoles("doctor"), doctorController.getPendingCases);

/**
 * @swagger
 * /api/doctor/reviewed-cases:
 *   get:
 *     summary: Get reviewed cases for a doctor
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: doctor_id
 *         required: true
 *         schema:
 *           type: string
 *         example: DOC-2001
 *     responses:
 *       200:
 *         description: Reviewed cases
 */
router.get("/reviewed-cases", verifyToken, allowRoles("doctor"), doctorController.getReviewedCases);

/**
 * @swagger
 * /api/doctor/case/{chatId}:
 *   get:
 *     summary: Get case details by chat ID
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         example: 92aaaa87-7c07-452f-91a7-7d22390097e6
 *       - in: query
 *         name: doctor_id
 *         required: true
 *         schema:
 *           type: string
 *         example: DOC-2001
 *     responses:
 *       200:
 *         description: Case details
 */
router.get("/case/:chatId", verifyToken, allowRoles("doctor"), doctorController.getCaseDetails);

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