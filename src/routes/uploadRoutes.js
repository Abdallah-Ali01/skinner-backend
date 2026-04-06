const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

// POST /api/upload/chat
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