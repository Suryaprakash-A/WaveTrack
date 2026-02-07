const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ispTicketId: {
      type: String,
      trim: true,
    },
    subscriberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscriber",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    issueTitle: {
      type: String,
      required: true,
      trim: true,
    },
    issueDescription: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      required: true,
      trim: true,
    },
    issueRaisedDate: {
      type: Date,
      required: true,
    },
    note: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Canceled", "Critical"],
      default: "Open",
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

module.exports = mongoose.model("Ticket", ticketSchema);
