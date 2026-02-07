const AuditLog = require("../models/AuditLog");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all audit logs
// @route   GET /api/v1/audit-logs
// @access  Private (admin, general_manager, senior_hr)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const auditLogs = await AuditLog.find()
      .populate("performedBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: auditLogs.length,
      data: auditLogs,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get audit logs for specific entity
// @route   GET /api/v1/audit-logs/entity/:entity/:entityId
// @access  Private (admin, general_manager, senior_hr)
exports.getEntityAuditLogs = async (req, res, next) => {
  try {
    const auditLogs = await AuditLog.find({
      entity: req.params.entity,
      entityId: req.params.entityId,
    })
      .populate("performedBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: auditLogs.length,
      data: auditLogs,
    });
  } catch (err) {
    next(err);
  }
};
