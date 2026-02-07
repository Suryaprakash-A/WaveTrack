const express = require("express");
const authCtrl = require("../controllers/authCtrl"); // Direct-ah controller object-ah edukkurom
const { protect } = require("../middlewares/auth");

const router = express.Router();

// Public route
router.post("/login", authCtrl.login);

// All routes below this line are protected
router.use(protect);

router.patch("/change-password/:id", authCtrl.changePassword);

// Customer/Subscriber view-kaga namma add panna pudhu route
router.get("/my-subscription", authCtrl.getMySubscriptionInfo);

module.exports = router;