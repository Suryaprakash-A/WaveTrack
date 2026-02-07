const Subscriber = require("../models/Subscriber");
const Ticket = require("../models/Ticket");
const asyncHandler = require("express-async-handler");

const automateController = {
  //InActivate Expired Subscribers
  // inActivateExpiredSubscriber: asyncHandler(async (req, res, next) => {
  //   try {
  //     const today = new Date();
  //     today.setHours(0, 0, 0, 0); // Normalize to start of day

  //     // 1. Find Active subscribers with expired/past renewal dates
  //     const expiredSubscribers = await Subscriber.find({
  //       status: "Active",
  //       "ispInfo.renewalDate": { $lte: today }, // Less than or equal to today
  //     });

  //     // 2. Bulk update their status to "InActive"
  //     if (expiredSubscribers.length > 0) {
  //       const idsToUpdate = expiredSubscribers.map((sub) => sub._id);
  //       await Subscriber.updateMany(
  //         { _id: { $in: idsToUpdate } },
  //         { $set: { status: "InActive" } }
  //       );
  //     }

  //     res.json({
  //       message: "Expired subscribers have been inactivated successfully.",
  //     });
  //   } catch (err) {
  //     res.status(500).json({ message: err.message });
  //   }
  // }),
  inActivateExpiredSubscriber: asyncHandler(async (req, res, next) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day

      // 1. Find Active subscribers with expired/past renewal dates
      const expiredSubscribers = await Subscriber.find({
        status: "Active",
        "ispInfo.renewalDate": { $lte: today }, // Less than or equal to today
      });

      // 2. Bulk update their status to "InActive"
      if (expiredSubscribers.length > 0) {
        const idsToUpdate = expiredSubscribers.map((sub) => sub._id);
        await Subscriber.updateMany(
          { _id: { $in: idsToUpdate } },
          { $set: { status: "InActive" } }
        );
      }

      // 1. Find Tickets with expired/past issueRaisedDate
      const expiredTickets = await Ticket.find({
        status: { $in: ["Open", "In Progress"] },
        issueRaisedDate: { $lte: today }, // Less than or equal to today
      });

      if (expiredTickets.length > 0) {
        const idsToUpdate = expiredTickets.map((ticket) => ticket._id);
        await Ticket.updateMany(
          { _id: { $in: idsToUpdate } },
          { $set: { status: "Critical" } }
        );
      }

      res.json({
        message: "Data has been successfully updated for current date.",
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }),
};

module.exports = automateController;
