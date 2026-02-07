const Employee = require("../models/Employee");
const Subscriber = require("../models/Subscriber"); 
const AuditLog = require("../models/AuditLog");
const ErrorResponse = require("../utils/errorResponse");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");

const authCtrl = {
  login: asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ErrorResponse("Please provide an email and password", 400));
    }

    try {
      const employee = await Employee.findOne({ email }).select("+password");

      // Debug 1: User irukkara nu check panna
      if (!employee) {
        console.log(`Login failed: Email ${email} not found`);
        return next(new ErrorResponse("Invalid credentials", 401));
      }

      // Debug 2: Status check-ah split pandrom (Thani thaniya check panna thaan error theriyum)
      if (employee.isDeleted) {
        console.log(`Login failed: Account ${email} is deleted`);
        return next(new ErrorResponse("Account is deleted", 401));
      }

      if (employee.status !== "Active") {
        console.log(`Login failed: Status is ${employee.status}, expected 'Active'`);
        return next(new ErrorResponse(`Account status is ${employee.status}`, 401));
      }

      if (employee.request_status !== "approved") {
        console.log(`Login failed: Request status is ${employee.request_status}, expected 'approved'`);
        return next(new ErrorResponse("Account is not yet approved", 401));
      }

      // Debug 3: Password match
      const isMatch = await bcrypt.compare(password, employee.password);
      if (!isMatch) {
        console.log(`Login failed: Password mismatch for ${email}`);
        return next(new ErrorResponse("Invalid credentials", 401));
      }

      const token = jwt.sign(
        { id: employee._id, roles: employee.roles },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      res.status(200).json({
        success: true,
        token,
        user: {
          _id: employee._id,
          name: employee.name,
          email: employee.email,
          roles: employee.roles,
        },
      });
    } catch (err) {
      next(err);
    }
  }),

  getMySubscriptionInfo: asyncHandler(async (req, res, next) => {
    try {
      console.log("--- FETCHING SUBSCRIPTION ---");
      console.log("User ID from Request:", req.user?.id);

      const subscriber = await Subscriber.findOne({ user: req.user.id });
      
      if (!subscriber) {
        console.log("No subscriber document found for user:", req.user.id);
        return next(new ErrorResponse("No subscription details found", 404));
      }

      res.status(200).json({
        success: true,
        data: subscriber,
      });
    } catch (err) {
      next(err);
    }
  }),

  changePassword: asyncHandler(async (req, res, next) => {
    try {
      const employee = await Employee.findById(req.params.id).select("+password");
      if (!employee) return next(new ErrorResponse("Employee not found", 404));

      const { currentPassword, newPassword } = req.body;
      const isMatch = await bcrypt.compare(currentPassword, employee.password);
      
      if (!isMatch) return next(new ErrorResponse("Current password is incorrect", 401));

      const salt = await bcrypt.genSalt(10);
      employee.password = await bcrypt.hash(newPassword, salt);
      await employee.save();

      res.status(200).json({ success: true, message: "Password Changed Successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }),
};

module.exports = authCtrl;