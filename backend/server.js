const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./Config/db");

// Load Environment variables
dotenv.config();

// Connect Database
connectDB();

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Basic Route for testing
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Port Setting
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
