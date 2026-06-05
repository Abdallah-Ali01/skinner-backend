const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
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

// ── CORS — handled by Nginx reverse proxy ────────────────────────────────
// Nginx sets Access-Control-Allow-Origin headers. Express cors() is kept
// only for local development (no Nginx). In production the header would be
// duplicated if both set it, so we pass through without adding headers here.
app.use(cors({
  origin: true,   // reflect the request origin — works for both dev and prod
  credentials: true
}));

// Explicitly handle OPTIONS preflight for all routes
app.options("*", cors());

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(morgan("dev"));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Rate limiting ─────────────────────────────────────────────────────────
// Strict limiter for all auth endpoints (login, register, forgot/reset password)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again in 15 minutes." }
});

app.use("/api/auth/login",             authLimiter);
app.use("/api/auth/register-patient",  authLimiter);
app.use("/api/auth/register-doctor",   authLimiter);
app.use("/api/auth/register-admin",    authLimiter);
app.use("/api/auth/forgot-password",   authLimiter);
app.use("/api/auth/reset-password",    authLimiter);

// ── Routes ────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "SKINNER backend is running" });
});

// Health check endpoint for keep-alive pings
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// /db-test — development only
if (process.env.NODE_ENV !== "production") {
  app.get("/db-test", async (req, res) => {
    try {
      const result = await pool.query("SELECT NOW()");
      res.json({ success: true, server_time: result.rows[0].now });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
}

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

// Swagger — always available (disable when no longer needed in production)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error handler — must be LAST middleware
app.use(errorHandler);

module.exports = app;