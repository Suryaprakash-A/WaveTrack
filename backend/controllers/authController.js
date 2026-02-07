const User = require("../models/User"); 
const ErrorResponse = require("../utils/errorResponse");
const jwt = require("jsonwebtoken");
// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse("Please provide an email and password", 400));
  }

  try {
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    if (!user.isActive) {
      return next(new ErrorResponse("Account is not active", 401));
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id, // Removed optional chaining as user is guaranteed here
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("+password");

    if (!(await user.matchPassword(req.body.currentPassword))) {
      return next(new ErrorResponse("Password is incorrect", 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// --- CORRECTED NEW FUNCTION ---

// @desc    Get info for the logged-in customer/subscriber
// @route   GET /api/v1/auth/my-subscription
// @access  Private
exports.getMySubscriptionInfo = async (req, res, next) => {
  try {
    // 1. Ensure the model name matches your file name exactly (case-sensitive on some systems)
    // If your file is Subscriber.js, use "../models/Subscriber"
    const Subscriber = require("../models/Subscriber"); 

    // 2. We use findOne to look for the 'user' field that links to the User model
    const subscriber = await Subscriber.findOne({ user: req.user.id });

    if (!subscriber) {
      // Use the next(ErrorResponse) pattern to stay consistent with your middleware
      return next(new ErrorResponse("No subscription details found for this user", 404));
    }

    res.status(200).json({
      success: true,
      data: subscriber
    });
  } catch (error) {
    // 3. Catching potential "Model not found" or "CastError"
    next(error);
  }
};