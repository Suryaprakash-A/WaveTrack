const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ["create", "update", "delete", "approve", "reject"],
    },
    entity: {
      type: String,
      required: true,
      enum: ["Employee"],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
    },
    // status: {
    //   type: String,
    //   enum: ["pending", "approved", "rejected"],
    // },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
