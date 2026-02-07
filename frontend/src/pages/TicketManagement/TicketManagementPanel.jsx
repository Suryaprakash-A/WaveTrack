import React, { useState } from "react";
import {
  FiClock,
  FiMapPin,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiExternalLink,
  FiSearch,
  FiCheck,
  FiX,
  FiEdit,
} from "react-icons/fi";
import { Loader } from "lucide-react";
import AddTicketForm from "./AddTicketForm";
import {
  approveTicketAPI,
  getTicketsAPI,
  rejectTicketAPI,
} from "../../services/ticketServices";
import { useQuery } from "@tanstack/react-query";
import { getUserRoles } from "../../utils/jwt";
import { hasPermission } from "../../utils/auth";
import UserHoverCard from "../../components/UserHoverCard";
import { useNavigate } from "react-router-dom";
import Toast from "../../components/Toast";
import UpdateTicketForm from "./UpdateTicketForm";

const TicketManagementPanel = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [loadingApprove, setLoadingApprove] = useState(null);
  const [loadingReject, setLoadingReject] = useState(null);

  const [submissionStatus, setSubmissionStatus] = useState(null);

  const [hoveredUser, setHoveredUser] = useState({
    modifiedBy: null,
    ticketId: null,
  });

  const userRoles = getUserRoles();
  const DecisionMaker = hasPermission(
    ["Admin", "General Manager", "Manager", "Team Lead"],
    userRoles
  );

  const {
    data: fetchedTickets,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryFn: getTicketsAPI,
    queryKey: ["getTickets"],
    refetchOnWindowFocus: true,
  });

  const tickets = fetchedTickets?.data;

  const [isNewTicketFormOpen, setIsNewTicketFormOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [isUpdateTicketFormOpen, setIsUpdateTicketFormOpen] = useState(false);

  const handleOpenUpdateTicketForm = (id) => {
    setSelectedTicketId(id);
    setIsUpdateTicketFormOpen(true);
  };

  const handleCloseUpdateTicketForm = () => {
    setSelectedTicketId(null);
    refetch();
    setIsUpdateTicketFormOpen(false);
  };

  const handleOpenNewTicketForm = () => {
    setIsNewTicketFormOpen(true);
  };

  const handleCloseNewTicketForm = () => {
    refetch();
    setIsNewTicketFormOpen(false);
  };

  const handleRowClick = (id) => {
    navigate(`/subscriber/${id}`);
  };

  const handleApprove = async (ticketId, status, ticket) => {
    setLoadingApprove(ticketId);
    try {
      const response = await approveTicketAPI(ticketId, status, ticket);

      // Refresh the employee list
      setTimeout(() => {
        refetch();
      }, 1000);

      // Show success message
      setSubmissionStatus({
        type: "success",
        message: response?.message ?? "Approved Successfully",
      });
    } catch (error) {
      setSubmissionStatus({
        type: "error",
        message:
          error?.response?.data?.error ??
          error?.message ??
          "Failed to Approve Subscriber",
      });
    } finally {
      setLoadingApprove(null);
    }
  };

  const handleReject = async (ticketId, status, ticket) => {
    setLoadingReject(ticketId);
    try {
      const response = await rejectTicketAPI(ticketId, status, ticket);

      // Refresh the employee list
      setTimeout(() => {
        refetch();
      }, 1000);

      // Show success message
      setSubmissionStatus({
        type: "success",
        message: response?.message ?? "Rejected Successfully",
      });
    } catch (error) {
      setSubmissionStatus({
        type: "error",
        message:
          error?.response?.data?.error ??
          error?.message ??
          "Failed to Reject Subscriber",
      });
    } finally {
      setLoadingReject(null);
    }
  };

  const deepSearch = (obj, searchTerm) => {
    if (typeof obj !== "object" || obj === null) {
      // Handle primitives (string, number, boolean)
      return obj?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    }

    // Handle arrays and objects
    return Object.values(obj).some((value) => {
      if (Array.isArray(value)) {
        return value.some((item) => deepSearch(item, searchTerm));
      } else if (typeof value === "object" && value !== null) {
        return deepSearch(value, searchTerm);
      } else {
        return value
          ?.toString()
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      }
    });
  };

  // Ticket filter counts
  const allTicketsReminder = tickets?.filter(
    (e) => e.request_status === "pending"
  ).length;
  const openTickets = tickets?.filter((e) => e.status === "Open").length;
  const inProgressTickets = tickets?.filter(
    (e) => e.status === "In Progress"
  ).length;
  const criticalTickets = tickets?.filter(
    (e) => e.status === "Critical"
  ).length;
  const resolvedTicketsReminder = tickets?.filter(
    (e) => e.status === "Resolved" && e.request_status === "pending"
  ).length;
  const highPriorityTickets = tickets?.filter(
    (e) => e.priority === "High" && e.status !== "Resolved"
  ).length;

  const filteredTickets = tickets
    ?.filter((ticket) => {
      const matchesFilter =
        activeFilter === "all" ||
        ticket.status.toLowerCase() === activeFilter.toLowerCase() ||
        (ticket.priority.toLowerCase() === activeFilter.toLowerCase() &&
          ticket.status.toLowerCase() !== "resolved");

      const matchesSearch = searchTerm === "" || deepSearch(ticket, searchTerm);

      return matchesFilter && matchesSearch;
    })
    ?.sort((a, b) => {
      if (a.request_status === "pending" && b.request_status !== "pending")
        return -1;
      if (a.request_status !== "pending" && b.request_status === "pending")
        return 1;

      // Then by createdAt (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  // Priority styling
  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-500/10 text-red-600 border-red-200";
      case "medium":
        return "bg-amber-500/10 text-amber-600 border-amber-200";
      case "low":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  // Status styling
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-blue-500/10 text-blue-600";
      case "in progress":
        return "bg-purple-500/10 text-purple-600";
      case "resolved":
        return "bg-emerald-500/10 text-emerald-600";
      case "closed":
        return "bg-gray-500/10 text-gray-600";
      case "critical":
        return "bg-red-500/10 text-red-600";
      default:
        return "bg-gray-500/10 text-gray-600";
    }
  };

  // Status icon
  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case "open":
        return <FiAlertCircle className="mr-1" />;
      case "in progress":
        return <FiClock className="mr-1" />;
      case "resolved":
      case "closed":
        return <FiCheckCircle className="mr-1" />;
      default:
        return <FiInfo className="mr-1" />;
    }
  };

  // Format date with time
  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="container pb-8">
      {isNewTicketFormOpen && (
        <AddTicketForm handleClose={handleCloseNewTicketForm} />
      )}
      {submissionStatus && (
        <Toast
          type={submissionStatus.type}
          message={submissionStatus.message}
          onClose={() => setSubmissionStatus(null)}
        />
      )}
      {isUpdateTicketFormOpen && (
        <UpdateTicketForm
          id={selectedTicketId}
          handleClose={handleCloseUpdateTicketForm}
        />
      )}

      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex flex-col items-center md:items-start">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 whitespace-nowrap">
              Ticket Directory
            </h2>
            <p className="text-gray-600 mt-1">
              {filteredTickets?.length}{" "}
              {filteredTickets?.length === 1 ? "ticket" : "tickets"} found
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search with advanced filter dropdown */}
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search tickets..."
                className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={handleOpenNewTicketForm}
              className="whitespace-nowrap px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              New Ticket
            </button>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 my-4 px-4">
        <button
          onClick={() => setActiveFilter("all")}
          className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilter === "all"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All Tickets
          {allTicketsReminder > 0 && (
            <span className="absolute -top-1 -right-2 bg-yellow-500 text-white text-sm font-semibold rounded-full h-5 w-5 flex items-center justify-center">
              {allTicketsReminder}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveFilter("high")}
          className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilter === "high"
              ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          High Priority
          {highPriorityTickets > 0 && (
            <span className="absolute -top-1 -right-2 bg-blue-50 text-white text-sm font-semibold rounded-full h-5 w-5 flex items-center justify-center">
              {highPriorityTickets}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveFilter("critical")}
          className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilter === "critical"
              ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Critical
          {criticalTickets > 0 && (
            <span className="absolute -top-1 -right-2 bg-blue-50 text-white text-sm font-semibold rounded-full h-5 w-5 flex items-center justify-center">
              {criticalTickets}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveFilter("open")}
          className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilter === "open"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Open
          {openTickets > 0 && (
            <span className="absolute -top-1 -right-2 bg-blue-50 text-white text-sm font-semibold rounded-full h-5 w-5 flex items-center justify-center">
              {openTickets}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveFilter("in progress")}
          className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilter === "in progress"
              ? "bg-purple-100 text-purple-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          In Progress
          {inProgressTickets > 0 && (
            <span className="absolute -top-1 -right-2 bg-blue-50 text-white text-sm font-semibold rounded-full h-5 w-5 flex items-center justify-center">
              {inProgressTickets}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveFilter("resolved")}
          className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilter === "resolved"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Resolved
          {resolvedTicketsReminder > 0 && (
            <span className="absolute -top-1 -right-2 bg-yellow-500 text-white text-sm font-semibold rounded-full h-5 w-5 flex items-center justify-center">
              {resolvedTicketsReminder}
            </span>
          )}
        </button>
      </div>

      {filteredTickets?.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center px-4">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FiInfo className="text-gray-400 text-2xl" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-1">
            No tickets found
          </h3>
          <p className="text-gray-600">
            Try adjusting your search or filter criteria
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
          {filteredTickets?.map((ticket) => (
            <div
              key={ticket._id}
              className={`${
                ticket.status === "Resolved"
                  ? "bg-green-200/50"
                  : ticket.status === "In Progress"
                  ? "bg-purple-200/50"
                  : ticket.status === "Critical"
                  ? "bg-red-200/50"
                  : ticket.status === "Open"
                  ? "bg-blue-200/50"
                  : "bg-gray-200/50"
              }  rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 border-1 border-gray-800 flex flex-col`}
            >
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span
                      className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(
                        ticket.status
                      )}`}
                    >
                      {getStatusIcon(ticket.status)}
                      {ticket.status}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getPriorityColor(
                      ticket.priority
                    )}`}
                  >
                    {ticket.priority} priority
                  </span>
                </div>

                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  {ticket.issueTitle}
                </h2>

                <p className="text-gray-600 text-sm mb-4 flex-1">
                  {ticket.issueDescription}
                </p>

                <div className="space-y-3 mb-4">
                  <div className="flex flex-col items-start text-sm text-gray-600">
                    <span className="text-xs text-black font-semibold">
                      {ticket.subscriberId.siteCode} {" - "}
                      {ticket.subscriberId.siteName}
                    </span>
                    <div className="flex items-center">
                      <FiMapPin className="mr-2 text-gray-400 flex-shrink-0" />
                      <span className="truncate">
                        {ticket.subscriberId.siteAddress}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Ticket ID</p>
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {ticket.ticketId}
                      </p>
                    </div>
                    {ticket.ispTicketId && (
                      <div>
                        <p className="text-xs text-gray-500">ISP Ticket ID</p>
                        <p className="text-sm font-medium text-gray-700">
                          {ticket?.ispTicketId}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Assigned To</p>
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {ticket?.assignedTo.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Raised On</p>
                      <p className="text-sm font-medium text-gray-700">
                        {formatDate(ticket.issueRaisedDate)}
                      </p>
                    </div>

                    {ticket?.note && (
                      <div className="col-span-2 bg-amber-100 p-2 rounded-xl">
                        <p className="text-xs text-gray-500">Note</p>
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {ticket.note}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center pt-3 border-t">
                    <div className="text-xs text-gray-500 relative">
                      <p>
                        Raised By:{" "}
                        <span
                          className="text-blue-500 hover:underline hover:cursor-pointer"
                          onMouseEnter={() => {
                            setHoveredUser({
                              modifiedBy: ticket?.created_by,
                              ticketId: ticket?._id,
                            });
                          }}
                          onMouseLeave={() =>
                            setHoveredUser({
                              modifiedBy: null,
                              ticketId: null,
                            })
                          }
                        >
                          {ticket?.created_by?.name}
                        </span>
                      </p>
                      {/* Hover Card */}
                      {hoveredUser?.modifiedBy?._id ===
                        ticket?.created_by?._id &&
                        hoveredUser?.ticketId === ticket?._id && (
                          <UserHoverCard userData={hoveredUser} />
                        )}
                      <p>
                        Authorized By:{" "}
                        <span
                          className="text-blue-500 hover:underline hover:cursor-pointer"
                          onMouseEnter={() => {
                            setHoveredUser({
                              modifiedBy: ticket?.decision_by,
                              ticketId: ticket?._id,
                            });
                          }}
                          onMouseLeave={() =>
                            setHoveredUser({
                              modifiedBy: null,
                              ticketId: null,
                            })
                          }
                        >
                          {ticket?.decision_by?.name}
                        </span>
                      </p>
                      {/* Hover Card */}
                      {hoveredUser?.modifiedBy?._id ===
                        ticket?.decision_by?._id &&
                        hoveredUser?.ticketId === ticket?._id && (
                          <UserHoverCard userData={hoveredUser} />
                        )}
                    </div>

                    <div className="text-xs text-gray-500 relative">
                      <p>Created: {formatDate(ticket?.createdAt)}</p>
                      <p>Updated: {formatDate(ticket?.updatedAt)}</p>
                    </div>
                  </div>

                  <div className="flex justify-between pt-1">
                    <button
                      className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors mt-1"
                      onClick={() => handleRowClick(ticket?.subscriberId?._id)}
                    >
                      <FiExternalLink className="mr-1" />
                      View Details
                    </button>

                    <div className="space-x-2">
                      {ticket?.request_status !== "pending" &&
                        ticket?.request_status !== "rejected" &&
                        ticket?.status !== "Resolved" && (
                          <button
                            className="p-1.5 text-blue-600 hover:bg-blue-500 hover:text-white rounded-md transition-colors cursor-pointer"
                            title="Edit"
                            onClick={() =>
                              handleOpenUpdateTicketForm(ticket?._id)
                            }
                          >
                            <FiEdit className="h-5 w-5" />
                          </button>
                        )}

                      {DecisionMaker &&
                        ticket?.request_status === "pending" && (
                          <div className="bg-white border-1 border-black rounded-lg space-x-2">
                            <button
                              className="p-1.5 text-green-600 hover:bg-green-500 hover:text-white rounded-md transition-colors"
                              title="Approve"
                              onClick={() =>
                                handleApprove(ticket._id, ticket.status, ticket)
                              }
                              disabled={loadingApprove === ticket._id}
                            >
                              {loadingApprove === ticket._id ? (
                                <Loader className="h-5 w-5 animate-spin" />
                              ) : (
                                <FiCheck className="h-5 w-5" />
                              )}
                            </button>
                            <button
                              className="p-1.5 text-red-600 hover:bg-red-500 hover:text-white rounded-md transition-colors"
                              title="Reject"
                              onClick={() =>
                                handleReject(ticket._id, ticket.status, ticket)
                              }
                              disabled={loadingReject === ticket._id}
                            >
                              {loadingReject === ticket._id ? (
                                <Loader className="h-5 w-5 animate-spin" />
                              ) : (
                                <FiX className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TicketManagementPanel;
