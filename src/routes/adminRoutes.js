const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");
const superAdminOnly = require("../middlewares/superAdminMiddleware");

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ApproveDoctorRequest:
 *       type: object
 *       required:
 *         - admin_id
 *         - medical_syndicate_id_card
 *       properties:
 *         admin_id:
 *           type: string
 *           example: 11111111-1111-1111-1111-111111111111
 *         medical_syndicate_id_card:
 *           type: string
 *           example: DOC-2001
 *
 *     RejectDoctorRequest:
 *       type: object
 *       required:
 *         - medical_syndicate_id_card
 *       properties:
 *         medical_syndicate_id_card:
 *           type: string
 *           example: DOC-3001
 */

/**
 * @swagger
 * /api/admin/pending-doctors:
 *   get:
 *     summary: Get pending doctors waiting for approval
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending doctors list
 */
router.get("/pending-doctors", verifyToken, allowRoles("admin"), adminController.getPendingDoctors);

/**
 * @swagger
 * /api/admin/approve-doctor:
 *   post:
 *     summary: Approve a doctor
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApproveDoctorRequest'
 *     responses:
 *       200:
 *         description: Doctor approved successfully
 */
router.post("/approve-doctor", verifyToken, allowRoles("admin"), adminController.approveDoctor);

/**
 * @swagger
 * /api/admin/reject-doctor:
 *   post:
 *     summary: Reject a doctor
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RejectDoctorRequest'
 *     responses:
 *       200:
 *         description: Doctor rejected
 */
router.post("/reject-doctor", verifyToken, allowRoles("admin"), adminController.rejectDoctor);

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     summary: Get all medical reports
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reports list
 */
router.get("/reports", verifyToken, allowRoles("admin"), adminController.getReports);

/**
 * @swagger
 * /api/admin/generate-admin-code:
 *   post:
 *     summary: Generate invite code for a new admin (super admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Admin invite code generated successfully
 *       403:
 *         description: Only super admin can perform this action
 */
router.post("/generate-admin-code", verifyToken, superAdminOnly, adminController.generateAdminCode);
module.exports = router;