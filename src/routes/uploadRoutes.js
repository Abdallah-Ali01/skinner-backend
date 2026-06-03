const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: File upload APIs
 */

/**
 * @swagger
 * /api/upload/chat:
 *   post:
 *     summary: Upload a file for chat (image or document)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image (JPG/PNG) or document (PDF) to upload (Max 5MB)
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 url:
 *                   type: string
 *                   example: "https://example.com/uploads/chat/1234567890.jpg"
 *                 type:
 *                   type: string
 *                   example: "image/jpeg"
 *       400:
 *         description: No file uploaded
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/chat", verifyToken, allowRoles("patient", "doctor"), upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/chat/${req.file.filename}`;

    res.json({
      success: true,
      url: fileUrl,
      type: req.file.mimetype,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;