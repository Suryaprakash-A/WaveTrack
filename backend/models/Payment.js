const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    subscriberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: ["Income", "Expense"],
      required: true,
      trim: true,
    },
    transactionMode: {
      type: String,
      required: true,
      enum: ["UPI", "Debit Card", "Credit Card", "Net Banking"],
      trim: true,
    },
    activationDate: {
      type: String,
      required: true,
      trim: true,
    },
    expiryDate: {
      type: String,
      required: true,
      trim: true,
    },
    transactionDate: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: String,
      required: true,
      trim: true,
    },
    remark: {
      type: String,
      maxlength: 200,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "Paid",
        "Received",
        "Refunding",
        "Refunded",
        "Rejected",
        "Deleted",
        "Modified",
      ],
      default: "Paid",
    },
    request_status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    modifiedData: {
      type: mongoose.Schema.Types.Mixed,
    },
    deleted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    decision_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);
