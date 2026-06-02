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
    // 1. Get column info for chat_message
    const columnsRes = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'chat_message'`
    );
    
    // 2. Try to run the query to see if it fails
    let queryError = null;
    let queryResult = null;
    try {
      const testQ = await pool.query(
        `SELECT COUNT(*)::integer FROM chat_message WHERE is_read = FALSE`
      );
      queryResult = testQ.rows[0];
    } catch (e) {
      queryError = e.message;
    }

    // 3. Try running the getPendingCases query with a dummy uuid or no results
    let pendingCasesError = null;
    try {
      await pool.query(`
        SELECT
          a.appointment_id,
          (
            SELECT COUNT(*)::integer
            FROM chat_message cm2
            WHERE cm2.chat_id = c.chat_id
              AND cm2.sender_role != 'doctor'
              AND cm2.is_read = FALSE
          ) AS unread_count
        FROM appointment a
        LEFT JOIN chat c ON a.patient_id = c.patient_id
        LIMIT 1
      `);
    } catch (e) {
      pendingCasesError = e.message;
    }

    res.json({
      success: true,
      columns: columnsRes.rows,
      queryResult,
      queryError,
      pendingCasesError
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