const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const { inActivateExpiredSubscriber } = require("../controllers/automateCtrl");

const router = express.Router();

router.use(protect);

router.get("/", inActivateExpiredSubscriber);

module.exports = router;
