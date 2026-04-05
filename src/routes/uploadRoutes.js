const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");

// POST /api/upload/chat
router.post("/chat", upload.single("file"), (req, res) => {
  try {
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