const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./Config/db");
const app = require("./app"); // Indha line dhaan unga app.js-la irukura routes-ah kondu varum

// 1. Env variables load pannanum
dotenv.config();

// 2. Database connect pannanum
connectDB();

// 3. Port settings
const PORT = process.env.PORT || 5000;

// 4. Start Server (app.js use panni)
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
