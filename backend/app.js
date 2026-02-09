const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
// const mongoSanitize = require("express-mongo-sanitize");
const errorHandler = require("./middlewares/error");
require("dotenv").config();

// Route files
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const subscriberRoutes = require("./routes/subscriberRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const auditRoutes = require("./routes/auditRoutes");
const automateRoutes = require("./routes/automateRoutes");
const ticketRoutes = require("./routes/ticketRoutes");

const app = express();

// Body parser
app.use(express.json());

// Dev logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 100 requests per windowMs
  });
  app.use(limiter);
}

// Enable CORS
const corsOptions = {
  // origin: process.env.FRONTEND_URL || "http://localhost:3000",
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
// app.use(cors());

// Set security headers
app.use(helmet());

// Sanitize data
// app.use(mongoSanitize());


app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1/subscribers", subscriberRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/tickets", ticketRoutes);
app.use("/api/v1/automate", automateRoutes);
app.use("/api/v1/audit-logs", auditRoutes);

// Error handler middleware
app.use(errorHandler);

module.exports = app;
