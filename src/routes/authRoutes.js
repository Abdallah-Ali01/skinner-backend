const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");
const uploadDoctorCard = require("../services/doctorCardUploadService");
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and password recovery APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterPatientRequest:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           example: Abdallah Tako
 *         phone:
 *           type: string
 *           example: "01000000000"
 *         gender:
 *           type: string
 *           example: male
 *         email:
 *           type: string
 *           example: abdallahtako5@gmail.com
 *         password:
 *           type: string
 *           example: "123456"
 *         age:
 *           type: integer
 *           example: 23
 *         address:
 *           type: string
 *           example: Alexandria
 *
 *     RegisterDoctorRequest:
 *       type: object
 *       required:
 *         - medical_syndicate_id_card
 *         - name
 *         - email
 *         - password
 *         - specialization
 *       properties:
 *         medical_syndicate_id_card:
 *           type: string
 *           example: DOC-2001
 *         name:
 *           type: string
 *           example: Dr. Ahmed Ali
 *         phone:
 *           type: string
 *           example: "01012345678"
 *         gender:
 *           type: string
 *           example: male
 *         email:
 *           type: string
 *           example: dr.ahmed@test.com
 *         national_id:
 *           type: string
 *           example: "29801011234567"
 *         password:
 *           type: string
 *           example: "12345678"
 *         year_of_experience:
 *           type: integer
 *           example: 7
 *         specialization:
 *           type: string
 *           example: Dermatology
 *         clinic_address:
 *           type: string
 *           example: Alexandria
 *
 *     RegisterAdminRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - invite_code
 *       properties:
 *         email:
 *           type: string
 *           example: admin2@test.com
 *         password:
 *           type: string
 *           example: "123456"
 *         invite_code:
 *           type: string
 *           example: ADM-82HF-9S1K
 *
 *     LoginRequest:
 *       type: object
 *       required:
 *         - role
 *         - email
 *         - password
 *       properties:
 *         role:
 *           type: string
 *           example: patient
 *         email:
 *           type: string
 *           example: abdallahtako5@gmail.com
 *         password:
 *           type: string
 *           example: "123456"
 *
 *     ForgotPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *         - role
 *       properties:
 *         email:
 *           type: string
 *           example: abdallahtako5@gmail.com
 *         role:
 *           type: string
 *           example: patient
 *
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *         - role
 *         - otp
 *         - new_password
 *       properties:
 *         email:
 *           type: string
 *           example: abdallahtako5@gmail.com
 *         role:
 *           type: string
 *           example: patient
 *         otp:
 *           type: string
 *           example: "483921"
 *         new_password:
 *           type: string
 *           example: "87654321"
 */

/**
 * @swagger
 * /api/auth/register-patient:
 *   post:
 *     summary: Register a new patient
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterPatientRequest'
 *     responses:
 *       201:
 *         description: Patient registered successfully
 *       500:
 *         description: Server error
 */
router.post("/register-patient", authController.registerPatient);

/**
 * @swagger
 * /api/auth/register-doctor:
 *   post:
 *     summary: Register a new doctor with syndicate card image
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - medical_syndicate_id_card
 *               - name
 *               - email
 *               - password
 *               - specialization
 *               - syndicate_card_image
 *             properties:
 *               medical_syndicate_id_card:
 *                 type: string
 *                 example: DOC-2001
 *               name:
 *                 type: string
 *                 example: Dr. Ahmed Ali
 *               phone:
 *                 type: string
 *                 example: "01012345678"
 *               gender:
 *                 type: string
 *                 example: male
 *               email:
 *                 type: string
 *                 example: dr.ahmed@test.com
 *               national_id:
 *                 type: string
 *                 example: "29801011234567"
 *               password:
 *                 type: string
 *                 example: "12345678"
 *               year_of_experience:
 *                 type: integer
 *                 example: 7
 *               specialization:
 *                 type: string
 *                 example: Dermatology
 *               clinic_address:
 *                 type: string
 *                 example: Alexandria
 *               syndicate_card_image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Doctor registered successfully
 *       500:
 *         description: Server error
 */
router.post("/register-doctor", uploadDoctorCard.single("syndicate_card_image"), authController.registerDoctor);
/**
 * @swagger
 * /api/auth/register-admin:
 *   post:
 *     summary: Register a new admin
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterAdminRequest'
 *     responses:
 *       201:
 *         description: Admin registered successfully
 *       500:
 *         description: Server error
 */
router.post("/register-admin", authController.registerAdmin);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login as patient, doctor, or admin
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *       500:
 *         description: Server error
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current logged in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 *       401:
 *         description: Unauthorized
 */
router.get("/me", verifyToken, authController.getMe);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send password reset OTP to user email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset code sent successfully
 *       500:
 *         description: Server error
 */
router.post("/forgot-password", authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successful
 *       500:
 *         description: Server error
 */
router.post("/reset-password", authController.resetPassword);

module.exports = router;