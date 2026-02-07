const express = require("express");
const {
  getAuditLogs,
  getEntityAuditLogs,
} = require("../controllers/auditController");
const { protect, authorize } = require("../middlewares/auth");

const router = express.Router();

router.use(protect);
router.use(authorize("admin", "general_manager", "senior_hr"));

router.get("/", getAuditLogs);
router.get("/entity/:entity/:entityId", getEntityAuditLogs);

module.exports = router;
