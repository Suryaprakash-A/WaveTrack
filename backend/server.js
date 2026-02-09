const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./Config/db");

// 1. Modhalla Environment variables-ah load pannanum
dotenv.config();

// 2. Database-ah connect pannanum
connectDB();

const app = express(); // Inga 'app' ah initialize pannanum

// 3. Middlewares
app.use(express.json());
app.use(cors());

// 4. Routes (Unga app.js-la routes irundha adhai inga use pannanum)
// Oru vela unga app.js-la ella routes-um irundha, adhai inga middleware-ah podalam
const appRoutes = require("./app"); 
app.use("/", appRoutes); 

// Basic Route for testing
app.get("/test", (req, res) => {
  res.send("API is running...");
});

// 5. Port Setting
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./Config/db");

// 1. Modhalla Environment variables-ah load pannanum
dotenv.config();

// 2. Database-ah connect pannanum
connectDB();

const app = express(); // Inga 'app' ah initialize pannanum

// 3. Middlewares
app.use(express.json());
app.use(cors());

// 4. Routes (Unga app.js-la routes irundha adhai inga use pannanum)
// Oru vela unga app.js-la ella routes-um irundha, adhai inga middleware-ah podalam
const appRoutes = require("./app"); 
app.use("/", appRoutes); 

// Basic Route for testing
app.get("/test", (req, res) => {
  res.send("API is running...");
});

// 5. Port Setting
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
