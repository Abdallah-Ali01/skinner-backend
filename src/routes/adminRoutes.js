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
 *         - medical_syndicate_id_card
 *       properties:
 *         medical_syndicate_id_card:
 *           type: string
 *           example: DOC-2001
 *         notes:
 *           type: string
 *           description: Optional verification notes to send in the approval email.
 *           example: "All credentials look correct. Welcome to Skinner!"
 *
 *     RejectDoctorRequest:
 *       type: object
 *       required:
 *         - medical_syndicate_id_card
 *       properties:
 *         medical_syndicate_id_card:
 *           type: string
 *           example: DOC-3001
 *         notes:
 *           type: string
 *           description: Optional notes explaining the reason for rejection, sent in the email.
 *           example: "Your medical syndicate ID card document was blurry and unreadable. Please re-register."
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
router.post("/generate-admin-code", verifyToken, allowRoles("admin"), superAdminOnly, adminController.generateAdminCode);

/**
 * @swagger
 * /api/admin/active-invite-code:
 *   get:
 *     summary: Retrieve the current active, unused and unexpired admin invite code (super admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active invite code details (or null if none active)
 *       403:
 *         description: Only super admin can perform this action
 */
router.get("/active-invite-code", verifyToken, allowRoles("admin"), superAdminOnly, adminController.getActiveInviteCode);
/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       example: 15
 *                     activeDoctors:
 *                       type: integer
 *                       example: 5
 *                     pendingApprovals:
 *                       type: integer
 *                       example: 2
 *                     totalAnalyses:
 *                       type: integer
 *                       example: 8
 */
router.get("/stats", verifyToken, allowRoles("admin"), adminController.getStats);

/**
 * @swagger
 * /api/admin/analyses:
 *   get:
 *     summary: Get all skin analysis records
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of skin analysis records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 10
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       analysis_id:
 *                         type: integer
 *                       patient_id:
 *                         type: integer
 *                       analysis:
 *                         type: string
 *                       skin_image_upload:
 *                         type: string
 *                       treatment_suggestion:
 *                         type: string
 *                       skin_disease_classification:
 *                         type: string
 *                       doctor_recommendation:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       patient_name:
 *                         type: string
 *                       patient_email:
 *                         type: string
 */
router.get("/analyses", verifyToken, allowRoles("admin"), adminController.getAnalyses);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all patients and doctors
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of patients and doctors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     patients:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           gender:
 *                             type: string
 *                           email:
 *                             type: string
 *                           age:
 *                             type: integer
 *                           address:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           role:
 *                             type: string
 *                             example: patient
 *                     doctors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           gender:
 *                             type: string
 *                           email:
 *                             type: string
 *                           specialization:
 *                             type: string
 *                           year_of_experience:
 *                             type: integer
 *                           clinic_address:
 *                             type: string
 *                           approval_status:
 *                             type: string
 *                             example: approved
 *                           role:
 *                             type: string
 *                             example: doctor
 */
router.get("/users", verifyToken, allowRoles("admin"), adminController.getUsers);

module.exports = router;