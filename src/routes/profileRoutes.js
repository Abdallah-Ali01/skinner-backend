const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const authController = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: User profile management APIs
 */

/**
 * @swagger
 * /api/profile/me:
 *   get:
 *     summary: Get current user's full profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full profile data for patient, doctor, or admin
 *       401:
 *         description: Unauthorized
 */
router.get("/me", verifyToken, authController.getMe);

/**
 * @swagger
 * /api/profile/update:
 *   put:
 *     summary: Update current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Name
 *               phone:
 *                 type: string
 *                 example: "01099999999"
 *               gender:
 *                 type: string
 *                 example: male
 *               age:
 *                 type: integer
 *                 example: 25
 *                 description: Patient only
 *               address:
 *                 type: string
 *                 example: Cairo
 *                 description: Patient only
 *               patient_history:
 *                 type: string
 *                 example: No known allergies
 *                 description: Patient only
 *               specialization:
 *                 type: string
 *                 example: Dermatology
 *                 description: Doctor only
 *               clinic_address:
 *                 type: string
 *                 example: 15 Nile St, Cairo
 *                 description: Doctor only
 *               year_of_experience:
 *                 type: integer
 *                 example: 10
 *                 description: Doctor only
 *               consultation_fee:
 *                 type: number
 *                 example: 200
 *                 description: Doctor only
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: No valid fields to update
 */
router.put(
  "/update",
  verifyToken,
  allowRoles("patient", "doctor"),
  profileController.updateProfile
);

module.exports = router;
