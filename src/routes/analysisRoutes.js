const express = require("express");
const router = express.Router();
const analysisController = require("../controllers/analysisController");
const upload = require("../services/uploadService");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

/**
 * @swagger
 * tags:
 *   name: Analysis
 *   description: AI image analysis APIs
 */

/**
 * @swagger
 * /api/analysis/upload-and-analyze:
 *   post:
 *     summary: Upload skin image and run AI analysis
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *               - image
 *             properties:
 *               patient_id:
 *                 type: string
 *                 example: fd3d3430-d8f0-49a6-958d-9739dd379dd1
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image analyzed successfully — returns analysis_id
 *       500:
 *         description: Server error
 */
router.post(
  "/upload-and-analyze",
  verifyToken,
  allowRoles("patient"),
  upload.single("image"),
  analysisController.uploadAndAnalyze
);

/**
 * @swagger
 * /api/analysis/patient/{patientId}/history:
 *   get:
 *     summary: Get all analyses for a patient
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         example: fd3d3430-d8f0-49a6-958d-9739dd379dd1
 *     responses:
 *       200:
 *         description: Patient analysis history
 *       500:
 *         description: Server error
 */
router.get(
  "/patient/:patientId/history",
  verifyToken,
  allowRoles("patient", "admin"),
  (req, res, next) => {
    if (req.user.role === "patient" && req.user.id !== req.params.patientId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
  },
  analysisController.getPatientHistory
);

/**
 * @swagger
 * /api/analysis/{analysisId}:
 *   get:
 *     summary: Get analysis by analysis ID
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: analysisId
 *         required: true
 *         schema:
 *           type: string
 *         example: 38acb04d-8087-4473-bb99-fd5910c6af67
 *     responses:
 *       200:
 *         description: Analysis details
 *       404:
 *         description: Analysis not found
 */
router.get(
  "/:analysisId",
  verifyToken,
  allowRoles("patient", "doctor", "admin"),
  analysisController.getAnalysisById
);

module.exports = router;