const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const {
  createPayment,
  getPayments,
  getPaymentsBySubscriberId,
  approvePayment,
  rejectPayment,
  getPaymentById,
  updatePayment,
  refundPayment,
} = require("../controllers/paymentCtrl");

const router = express.Router();

router.use(protect);

router.get("/", getPayments);

router.get("/:subId", getPaymentsBySubscriberId);

router.get("/id/:paymentId", getPaymentById);

router.post(
  "/",
  authorize("Admin", "General Manager", "Manager", "Finance"),
  createPayment
);

router.patch(
  "/:id",
  authorize("Admin", "General Manager", "Manager", "Finance"),
  updatePayment
);

router.patch(
  "/:id/approve",
  authorize("Admin", "General Manager", "Manager"),
  approvePayment
);

router.patch(
  "/:id/reject",
  authorize("Admin", "General Manager", "Manager"),
  rejectPayment
);

router.patch(
  "/:id/refund",
  authorize("Admin", "General Manager", "Manager", "Finance"),
  refundPayment
);

module.exports = router;
