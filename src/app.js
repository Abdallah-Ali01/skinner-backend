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
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { errorHandler } = require("./middlewares/errorMiddleware");
const path = require("path");
const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({
    message: "SKINNER backend is running"
  });
});

app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      success: true,
      server_time: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/appointment", appointmentRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(errorHandler);

module.exports = app;