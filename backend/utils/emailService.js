const nodemailer = require("nodemailer");
const config = require("../config/config");

// Create transporter
const transporter = nodemailer.createTransport({
  service: config.email.service,
  auth: {
    user: config.email.auth.user,
    pass: config.email.auth.pass,
  },
});

/**
 * Send approval notification email
 */
exports.sendApprovalEmail = async (to, subject, text) => {
  try {
    const mailOptions = {
      from: config.email.from,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending approval email:", error);
    throw error;
  }
};

/**
 * Send employee account activation email
 */
exports.sendActivationEmail = async (email, name, temporaryPassword) => {
  try {
    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: "Your Employee Account Has Been Activated",
      html: `
        <p>Hello ${name},</p>
        <p>Your employee account has been approved and activated.</p>
        <p>You can now login using the following credentials:</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
        <p>Please change your password after first login.</p>
        <p>Best regards,<br>Employee Management Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending activation email:", error);
    throw error;
  }
};

/**
 * Send password reset email
 */
exports.sendPasswordResetEmail = async (email, token) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: "Password Reset Request",
      html: `
        <p>You requested a password reset for your account.</p>
        <p>Please click the following link to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};
