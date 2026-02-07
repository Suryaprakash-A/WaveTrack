const Employee = require("../models/Employee");
const AuditLog = require("../models/AuditLog");
const ErrorResponse = require("../utils/errorResponse");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");

const employeeController = {
  //Create a new employee
  createEmployee: asyncHandler(async (req, res, next) => {
    const { name, email, contact, roles, remark } = req.body;
    const password = process.env.DEFAULT_PASSWORD || "Udhith@1234"; // Default password if not provided

    // Validate required fields
    if (!name || !email || !contact || !password || !roles?.length) {
      return next(new ErrorResponse("Missing required fields", 400));
    }

    // Generate unique employee_id (format: EMP-XXXXX)
    const generateEmployeeId = async () => {
      const prefix = "EMP-";
      const randomSuffix = Math.floor(10000 + Math.random() * 90000).toString();
      const employee_id = prefix + randomSuffix;

      // Check if ID already exists
      const exists = await Employee.findOne({ employee_id });
      return exists ? await generateEmployeeId() : employee_id;
    };

    // Check if email already exists
    const existingEmail = await Employee.findOne({ email });
    if (existingEmail) {
      return next(new ErrorResponse("Email already exists", 400));
    }

    // Check if contact already exists
    const existingContact = await Employee.findOne({ contact });
    if (existingContact) {
      return next(new ErrorResponse("Contact number already exists", 400));
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new employee with unique ID
    const employee = await Employee.create({
      employee_id: await generateEmployeeId(),
      name,
      email,
      contact,
      password: hashedPassword,
      roles,
      remark,
      joining_date: new Date(),
      created_by: req.user.id,
      status: "OnProcess",
    });

    // // Prepare audit log data
    // const newData = {
    //   id: employee._id,
    //   employee_id: employee.employee_id,
    //   name,
    //   email,
    //   contact,
    //   roles,
    //   remark,
    //   joining_date: employee.joining_date,
    // };

    // await AuditLog.create({
    //   action: "create",
    //   entity: "Employee",
    //   entityId: employee._id,
    //   performedBy: req.user.id,
    //   changes: {
    //     previous: null, // No previous data for creation
    //     current: newData,
    //   },
    // });

    res.status(201).json({
      success: true,
      data: {
        employee_id: employee.employee_id,
        name: employee?.name,
        email: employee?.email,
        roles: employee?.roles,
        joining_date: employee?.joining_date,
        status: employee?.status,
      },
    });
  }),

  // Get all employees
  getEmployees: asyncHandler(async (req, res, next) => {
    try {
      const { status, role } = req.query;
      let query = { isDeleted: false };

      if (status) query.status = status;
      if (role) query.roles = { $in: [role] };

      const employees = await Employee.find(query).populate({
        path: "modifiedData.modified_by",
        select: "employee_id name email contact roles",
        model: "Employee",
      });

      res.status(200).json({
        success: true,
        count: employees.length,
        data: employees,
      });
    } catch (err) {
      next(err);
    }
  }),

  getEmployeeById: asyncHandler(async (req, res, next) => {
    try {
      const employee = await Employee.findById(req.params.id);
      res.status(200).json({
        success: true,
        data: employee,
      });
    } catch (err) {
      next(err);
    }
  }),

  //Approve Employee
  approveEmployee: asyncHandler(async (req, res, next) => {
    try {
      const employee = await Employee.findById(req.params.id);

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (employee.request_status !== "pending") {
        return res.status(400).json({ message: "Request already processed" });
      }

      const updatedEmployee = await Employee.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          decision_by: req.user.id,
          updatedAt: Date.now(),
        },
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        data: updatedEmployee,
        message: "Employee Approved Successfully",
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }),

  //Reject Employee
  rejectEmployee: asyncHandler(async (req, res, next) => {
    try {
      const employee = await Employee.findById(req.params.id);

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (employee.request_status !== "pending") {
        return res.status(400).json({ message: "Request already processed" });
      }

      const updatedEmployee = await Employee.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          decision_by: req.user.id,
          updatedAt: Date.now(),
        },
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        data: updatedEmployee,
        message: "Employee Rejected Successfully",
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }),

  //Update Employee
  updateEmployee: asyncHandler(async (req, res, next) => {
    try {
      const employee = await Employee.findById(req.params.id);

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Extract the fields you want to track changes for
      const trackedFields = ["name", "email", "contact", "roles"];

      // Prepare previous and current data objects
      const previousData = {};
      const currentData = {};

      trackedFields.forEach((field) => {
        previousData[field] = employee[field]; // Get old value from DB
        currentData[field] = req.body[field] || employee[field]; // New value from request or keep old
      });

      const updatedEmployee = await Employee.findByIdAndUpdate(
        req.params.id,
        {
          // ...req.body,
          remark: req.body.remark,
          modifiedData: {
            previous: previousData,
            current: currentData,
            modified_by: req.user.id,
            modified_at: Date.now(),
          },
          updatedAt: Date.now(),
          request_status: "pending",
          status: "Modified",
        },
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        data: updatedEmployee,
        message: "Employee Updated Successfully",
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }),

  //InActivate Employee
  inActivateEmployee: asyncHandler(async (req, res, next) => {
    try {
      const employee = await Employee.findById(req.params.id);

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      const inActivatedEmployee = await Employee.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          decision_by: req.user.id,
          updatedAt: Date.now(),
        },
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        data: inActivatedEmployee,
        message: `Employee ${req.body.status} in Process`,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }),

  //Reset Password
  resetPassword: asyncHandler(async (req, res, next) => {
    try {
      const employee = await Employee.findById(req.params.id);

      const password = process.env.DEFAULT_PASSWORD || "Udhith@1234";

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await Employee.findByIdAndUpdate(
        req.params.id,
        {
          password: hashedPassword,
          decision_by: req.user.id,
          updatedAt: Date.now(),
        },
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: "Password Reset Successfully",
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }),

  //Delete Employee
  deleteEmployee: asyncHandler(async (req, res, next) => {
    try {
      const employee = await Employee.findById(req.params.id);

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // await Employee.findByIdAndDelete(req.params.id);
      await Employee.findByIdAndUpdate(
        req.params.id,
        {
          status: "Deleted",
          deleted_by: req.user.id,
          isDeleted: true,
          updatedAt: Date.now(),
        },
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: "Employee Deleted Successfully",
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }),
};

module.exports = employeeController;
