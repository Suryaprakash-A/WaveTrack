const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config/config");

/**
 * Generate hashed password
 */
exports.hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Generate JWT token
 */
exports.generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiration,
  });
};

/**
 * Generate random password
 */
exports.generateRandomPassword = (length = 12) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
  let password = "";

  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
};

/**
 * Format response data
 */
exports.formatResponse = (success, data = null, message = "", code = 200) => {
  return {
    success,
    code,
    message,
    data,
  };
};

/**
 * Error handler
 */
exports.errorHandler = (error, statusCode = 400) => {
  return {
    success: false,
    code: statusCode,
    message: error.message || "An error occurred",
    error: process.env.NODE_ENV === "development" ? error.stack : undefined,
  };
};

/**
 * Sanitize data for logging
 */
exports.sanitizeForLog = (data) => {
  if (typeof data !== "object") return data;

  const sensitiveFields = ["password", "token", "authorization"];
  const sanitized = { ...data };

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "***REDACTED***";
    }
  });

  return sanitized;
};
