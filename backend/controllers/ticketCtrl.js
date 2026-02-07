const Ticket = require("../models/Ticket");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");

const ticketController = {
  //Create a new ticket
  createTicket: asyncHandler(async (req, res, next) => {
    const {
      subscriberId,
      issueTitle,
      issueDescription,
      priority,
      assignedTo,
      issueRaisedDate,
    } = req.body;

    // Validate required fields
    const requiredFields = {
      subscriberId,
      issueTitle,
      issueDescription,
      priority,
      assignedTo,
      issueRaisedDate,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return next(
        new ErrorResponse(
          `Missing required fields: ${missingFields.join(", ")}`,
          400
        )
      );
    }

    // Generate unique ticketId (format: TKT-XXXXX)
    const generateTicketId = async () => {
      const prefix = "TKT-";
      const randomSuffix = Math.floor(
        1000000000 + Math.random() * 9000000000
      ).toString();
      const ticketId = prefix + randomSuffix;

      // Check if ID already exists
      const exists = await Ticket.findOne({ ticketId });
      return exists ? await generateTicketId() : ticketId;
    };

    try {
      // Create ticket data object
      const ticketData = {
        ticketId: await generateTicketId(),
        subscriberId,
        issueTitle,
        issueDescription,
        priority,
        assignedTo,
        issueRaisedDate,
        status: "Open",
        request_status: "pending",
        created_by: req.user.id,
      };

      // Create new ticket
      const ticket = await Ticket.create(ticketData);

      res.status(201).json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      console.error("Error creating ticket:", error);
      return next(
        new ErrorResponse(
          error.message || "Failed to create ticket",
          error.statusCode || 500
        )
      );
    }
  }),

  //Get all tickets
  getTickets: asyncHandler(async (req, res, next) => {
    try {
      const { status } = req.query;
      let query = { isDeleted: false };

      if (status) query.status = status;

      const tickets = await Ticket.find(query)
        .populate({
          path: "subscriberId",
          select: "subscriber_id siteName siteCode siteAddress",
          model: "Subscriber",
        })
        .populate({
          path: "assignedTo",
          select: "employee_id name email contact roles",
          model: "Employee",
        })
        .populate({
          path: "modifiedData.modified_by",
          select: "employee_id name email contact roles",
          model: "Employee",
        })
        .populate({
          path: "created_by",
          select: "employee_id name email contact roles",
          model: "Employee",
        })
        .populate({
          path: "decision_by",
          select: "employee_id name email contact roles",
          model: "Employee",
        });

      res.status(200).json({
        success: true,
        count: tickets.length,
        data: tickets,
      });
    } catch (err) {
      next(err);
    }
  }),

  //Get tickets by id
  getTicketById: asyncHandler(async (req, res, next) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid ID format" });
      }

      const ticket = await Ticket.findById(req.params.id)
        .populate({
          path: "subscriberId",
          select: "subscriber_id siteName siteCode siteAddress",
          model: "Subscriber",
        })
        .populate({
          path: "assignedTo",
          select: "employee_id name email contact roles",
          model: "Employee",
        })
        .populate({
          path: "modifiedData.modified_by",
          select: "employee_id name email contact roles",
          model: "Employee",
        })
        .populate({
          path: "created_by",
          select: "employee_id name email contact roles",
          model: "Employee",
        })
        .populate({
          path: "decision_by",
          select: "employee_id name email contact roles",
          model: "Employee",
        });

      if (!ticket) {
        return res
          .status(404)
          .json({ success: false, message: "Ticket not found" });
      }

      res.status(200).json({
        success: true,
        data: ticket,
      });
    } catch (err) {
      next(err);
    }
  }),

  //Approve Tickets
  approveTicket: asyncHandler(async (req, res, next) => {
    try {
      const ticket = await Ticket.findById(req.params.id);

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      if (ticket.request_status !== "pending") {
        return res.status(400).json({ message: "Request already processed" });
      }

      let update;
      if (ticket.status === "Open" || ticket.status === "Resolved") {
        update = {
          ...req.body,
          decision_by: req.user.id,
          updatedAt: Date.now(),
        };
      }

      const updatedTicket = await Ticket.findByIdAndUpdate(
        req.params.id,
        update,
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        data: updatedTicket,
        message: "Ticket Approved Successfully",
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }),

  //Reject Ticket
  rejectTicket: asyncHandler(async (req, res, next) => {
    try {
      const ticket = await Ticket.findById(req.params.id);

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      if (ticket.request_status !== "pending") {
        return res.status(400).json({ message: "Request already processed" });
      }

      const updatedTicket = await Ticket.findByIdAndUpdate(
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
        data: updatedTicket,
        message: "Ticket Rejected Successfully",
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }),

  //Update Ticket
  updateTicket: asyncHandler(async (req, res, next) => {
    try {
      const ticket = await Ticket.findById(req.params.id);

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const updatedTicket = await Ticket.findByIdAndUpdate(
        req.params.id,
        {
          ispTicketId: req.body.ispTicketId,
          note: req.body.note,
          status: "In Progress",
          updatedAt: Date.now(),
        },
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        data: updatedTicket,
        message: "Ticket Updated Successfully",
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }),

  //Resolve Ticket
  resolveTicket: asyncHandler(async (req, res, next) => {
    try {
      const ticket = await Ticket.findById(req.params.id);

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const resolvedTicket = await Ticket.findByIdAndUpdate(
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
        data: resolvedTicket,
        message: `Ticket ${req.body.status} in Process`,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }),
};

module.exports = ticketController;
