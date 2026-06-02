const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const pool = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const analysisRoutes = require("./routes/analysisRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const chatRoutes = require("./routes/chatRoutes");
const adminRoutes = require("./routes/adminRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const patientDoctorRoutes = require("./routes/patientDoctorRoutes");
const profileRoutes = require("./routes/profileRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { errorHandler } = require("./middlewares/errorMiddleware");
const path = require("path");
const app = express();

// Allow multiple origins (local dev + production frontend)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.BASE_URL,
  "https://skinnerai.site",
  "https://www.skinnerai.site"
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all for now on free tier
  },
  credentials: true
}));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(morgan("dev"));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({
    message: "SKINNER backend is running"
  });
});

// Health check endpoint for keep-alive pings
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/db-test", async (req, res) => {
  try {
    const confirmedCount = await pool.query(
      "SELECT COUNT(*) AS count FROM appointment WHERE status = 'confirmed'"
    );
    const completedCount = await pool.query(
      "SELECT COUNT(*) AS count FROM appointment WHERE status = 'completed'"
    );
    const pendingPaymentCount = await pool.query(
      "SELECT COUNT(*) AS count FROM appointment WHERE status = 'pending_payment'"
    );
    const chatsCount = await pool.query(
      "SELECT COUNT(*) AS count FROM chat"
    );
    const messagesCount = await pool.query(
      "SELECT COUNT(*) AS count FROM chat_message"
    );
    const summaryCardsCount = await pool.query(
      "SELECT COUNT(*) AS count FROM chat_message WHERE original_filename = 'skin_analysis.jpg'"
    );

    res.json({
      success: true,
      confirmedCount: confirmedCount.rows[0].count,
      completedCount: completedCount.rows[0].count,
      pendingPaymentCount: pendingPaymentCount.rows[0].count,
      chatsCount: chatsCount.rows[0].count,
      messagesCount: messagesCount.rows[0].count,
      summaryCardsCount: summaryCardsCount.rows[0].count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// API Routes — all registered BEFORE the error handler
app.use("/api/auth", authRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/appointment", appointmentRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/doctors", patientDoctorRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error handler — must be LAST middleware
app.use(errorHandler);

module.exports = app;