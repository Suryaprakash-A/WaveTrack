const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    employee_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    contact: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Exclude password from queries by default
    },
    roles: [
      {
        type: String,
        enum: [
          "Admin",
          "General Manager",
          "Manager",
          "Senior HR",
          "HR",
          "Finance",
          "Team Lead",
          "Staff",
        ],
        required: true,
      },
    ],
    remark: {
      type: String,
      maxlength: 200,
      trim: true,
    },
    joining_date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: [
        "OnProcess",
        "Active",
        "InActive",
        "Rejected",
        "Deleted",
        "Modified",
      ],
      default: "OnProcess",
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

module.exports = mongoose.model("Employee", employeeSchema);
