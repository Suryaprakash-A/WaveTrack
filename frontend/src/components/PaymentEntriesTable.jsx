import {
  FiEdit,
  FiSearch,
  FiFilter,
  FiDownload,
  FiPlus,
  FiChevronUp,
  FiChevronDown,
  FiCheck,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiDelete,
  FiTrash,
} from "react-icons/fi";
import { HiOutlineReceiptRefund } from "react-icons/hi";
import { Loader } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { getUserRoles } from "../utils/jwt";
import { hasPermission } from "../utils/auth";
import NoData from "./NoData";
import * as XLSX from "xlsx";
import AddPaymentForm from "../pages/SubscriberManagement/Subscriber/Payments/AddPaymentForm";
import UserHoverCard from "./UserHoverCard";
import {
  approvePaymentAPI,
  refundPaymentAPI,
  rejectPaymentAPI,
} from "../services/paymentServices";
import UpdatePaymentForm from "../pages/SubscriberManagement/Subscriber/Payments/UpdatePaymentForm";
import Toast from "./Toast";
import { useMutation } from "@tanstack/react-query";

const PaymentEntriesTable = ({ payments, refetch, subscriber, subRefetch }) => {
  const [activeFilters, setActiveFilters] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingApprove, setLoadingApprove] = useState(null);
  const [loadingReject, setLoadingReject] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);

  const [sortConfig, setSortConfig] = useState({
    key: "transactionDate",
    direction: "dec",
  });

  const userRoles = getUserRoles();
  const DecisionMaker = hasPermission(
    ["Admin", "General Manager", "Manager", "Senior HR"],
    userRoles
  );

  // //Refund Mutation
  // const {
  //   mutateAsync: refundPaymentMutate,
  //   isLoading: isRefundLoading,
  //   isSuccess: isRefundSuccess,
  // } = useMutation({
  //   mutationFn: () => refundPaymentAPI(id, subscriberData.status),
  //   mutationKey: ["refundPayment", id],
  // });

  const [hoveredUser, setHoveredUser] = useState({
    modifiedBy: null,
    paymentId: null,
  });

  const [filters, setFilters] = useState({
    status: "",
    transactionType: "",
    startDate: "",
    endDate: "",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Filter and sort payments
  const processedPayments = React.useMemo(() => {
    if (!payments) return [];

    let result = [...payments];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((payment) =>
        payment?.transactionId.toLowerCase().includes(term)
      );
    }

    // Apply filters
    if (filters.status) {
      result = result.filter((payment) => payment.status === filters.status);
    }
    if (filters.transactionType) {
      result = result.filter(
        (payment) => payment.transactionType === filters.transactionType
      );
    }

    // Apply date range filter
    if (filters.startDate || filters.endDate) {
      result = result.filter((payment) => {
        const transactionDate = new Date(payment.transactionDate.split("T")[0]);
        const startDate = filters.startDate
          ? new Date(filters.startDate)
          : null;
        const endDate = filters.endDate ? new Date(filters.endDate) : null;

        // Set time to midnight for proper comparison
        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);

        const afterStart = !startDate || transactionDate >= startDate;
        const beforeEnd = !endDate || transactionDate <= endDate;

        return afterStart && beforeEnd;
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        // First sort by request_status (pending first)
        if (a.request_status === "pending" && b.request_status !== "pending") {
          return -1;
        }
        if (a.request_status !== "pending" && b.request_status === "pending") {
          return 1;
        }

        // if (
        //   a.request_status === "rejected" &&
        //   b.request_status !== "rejected"
        // ) {
        //   return -1;
        // }
        // if (
        //   a.request_status !== "rejected" &&
        //   b.request_status === "rejected"
        // ) {
        //   return 1;
        // }

        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    } else {
      // Default sort: pending first, then by createdAt (newest first)
      result.sort((a, b) => {
        // Pending first
        if (a.request_status === "pending" && b.request_status !== "pending") {
          return -1;
        }
        if (a.request_status !== "pending" && b.request_status === "pending") {
          return 1;
        }

        // Then by createdAt (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    return result;
  }, [payments, searchTerm, filters, sortConfig]);

  // Get current items
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedPayments.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(processedPayments.length / itemsPerPage);

  // Change page
  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, sortConfig]);

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.transactionType) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    setActiveFilters(count);
  }, [filters]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: "", transactionType: "", startDate: "", endDate: "" });
    setSearchTerm("");
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? <FiChevronUp /> : <FiChevronDown />;
  };

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const exportToExcel = async () => {
    setIsExporting(true);
    setProgress(0);

    try {
      setProgress(10); // Starting
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setProgress(30);
      // Determine which data to export
      const dataToExport = processedPayments;

      if (!dataToExport || dataToExport.length === 0) {
        alert("No data available to export");
        return;
      }

      setProgress(50);

      // Prepare the worksheet data
      const worksheetData = dataToExport.map((payment) => ({
        "Site Code": payment?.subscriberId?.siteCode || "",
        "Transaction ID": payment?.transactionId || "",
        "Transaction Type": payment?.transactionType || "",
        "Transaction Mode": payment?.transactionMode || "",
        "Activation Date": payment?.activationDate?.split("T")[0] || "",
        "Renewal Date": payment?.expiryDate?.split("T")[0] || "",
        Amount: payment?.amount || "",
        "Transaction Date": payment?.transactionDate?.split("T")[0] || "",
        Status: payment?.status || "",
        "Recorded By": payment?.created_by?.name || "",
        "Modified By": payment?.modifiedData?.modified_by?.name || "",
        "Verified By": payment?.decision_by?.name || "",
      }));

      setProgress(70);

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        `${subscriber?.siteCode} Payments`
      );

      setProgress(90);

      // Generate Excel file and trigger download
      const fileName = `${subscriber?.siteCode}_Payments_(${
        subscriber?.subscriber_id
      })${new Date().toISOString().split("T")[0]}.xlsx`;

      XLSX.writeFile(workbook, fileName, { compression: true });

      setProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Small delay for completion animation
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const [isNewPaymentFormOpen, setIsNewPaymentFormOpen] = useState(false);

  const handleOpenNewPaymentForm = () => {
    setIsNewPaymentFormOpen(true);
  };

  const handleCloseNewPaymentForm = () => {
    refetch();
    subRefetch();
    setIsNewPaymentFormOpen(false);
  };

  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [isUpdatePaymentFormOpen, setIsUpdatePaymentFormOpen] = useState(false);

  const handleOpenUpdatePaymentForm = async (id) => {
    setSelectedPaymentId(id);
    setIsUpdatePaymentFormOpen(true);
  };

  const handleCloseUpdatePaymentForm = () => {
    setSelectedPaymentId(null);
    refetch();
    subRefetch();
    setIsUpdatePaymentFormOpen(false);
  };

  const handleApprove = async (paymentId, status, payment) => {
    setLoadingApprove(paymentId);
    try {
      const response = await approvePaymentAPI(paymentId, status, payment);

      // Refresh the payment list
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
          "Failed to Approve Payment",
      });
    } finally {
      setLoadingApprove(null);
    }
  };

  const handleReject = async (paymentId, status, payment) => {
    setLoadingReject(paymentId);
    try {
      const response = await rejectPaymentAPI(paymentId, status, payment);

      // Refresh the payment list
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
          "Failed to Reject Payment",
      });
    } finally {
      setLoadingReject(null);
    }
  };

  const fieldDisplayNames = {
    transactionMode: "Transaction Mode",
    amount: "Amount",
    activationDate: "Activation Date",
    expiryDate: "Expiry Date",
  };

  function getDisplayName(fieldPath) {
    // Check if we have a direct mapping
    if (fieldDisplayNames[fieldPath]) {
      return fieldDisplayNames[fieldPath];
    }

    // Fallback transformation for unlisted fields
    return fieldPath
      .split(".") // Split nested paths
      .map(
        (part) =>
          part
            .replace(/([A-Z])/g, " $1") // Add space before capitals
            .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
            .replace(/Of|And|The/gi, (match) => match.toLowerCase()) // Handle special words
      )
      .join(" "); // Join with spaces
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {isNewPaymentFormOpen && (
        <AddPaymentForm
          subscriber={subscriber}
          handleClose={handleCloseNewPaymentForm}
          paymentsLength={payments?.length}
        />
      )}

      {isUpdatePaymentFormOpen && (
        <UpdatePaymentForm
          id={selectedPaymentId}
          handleClose={handleCloseUpdatePaymentForm}
        />
      )}

      {submissionStatus && (
        <Toast
          type={submissionStatus.type}
          message={submissionStatus.message}
          onClose={() => setSubmissionStatus(null)}
        />
      )}

      {/* Table Controls */}
      <div className="sticky top-0 bg-white z-20 p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search payments by Id..."
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Filter Button */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <button
                onClick={() =>
                  document
                    .getElementById("filter-dropdown")
                    .classList.toggle("hidden")
                }
                className={`p-1 rounded-full ${
                  activeFilters > 0
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-400 hover:text-gray-500"
                }`}
                title="Filters"
              >
                <div className="relative">
                  <FiFilter className="h-5 w-5" />
                  {activeFilters > 0 && (
                    <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {activeFilters}
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Filter Dropdown */}
            <div
              id="filter-dropdown"
              className="hidden absolute left-0 sm:left-auto sm:right-0 mt-1 w-full sm:w-64 bg-white rounded-md shadow-lg z-20 p-3 border"
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full border rounded-md p-2 text-sm"
                    value={filters.status}
                    onChange={(e) =>
                      handleFilterChange("status", e.target.value)
                    }
                  >
                    <option value="">All Statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="Received">Received</option>
                    <option value="Refunded">Refunded</option>
                    <option value="Refunding">Refunding</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    className="w-full border rounded-md p-2 text-sm"
                    value={filters.transactionType}
                    onChange={(e) =>
                      handleFilterChange("transactionType", e.target.value)
                    }
                  >
                    <option value="">All Types</option>
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>

                {/* Improved Date Range Filter */}
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) =>
                          handleFilterChange("startDate", e.target.value)
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2"
                        max={filters.endDate || undefined}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) =>
                          handleFilterChange("endDate", e.target.value)
                        }
                        min={filters.startDate || undefined}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2"
                      />
                    </div>
                  </div>
                  {(filters.startDate || filters.endDate) && (
                    <button
                      onClick={() =>
                        setFilters({ ...filters, startDate: "", endDate: "" })
                      }
                      className="w-full text-sm py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      Clear Dates
                    </button>
                  )}
                </div>

                <div className="w-full">
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Payments Per Page:{" "}
                    <span className="text-blue-600 font-bold">
                      {itemsPerPage}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={() =>
                      document
                        .getElementById("filter-dropdown")
                        .classList.add("hidden")
                    }
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end relative">
          <button
            onClick={exportToExcel}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FiDownload /> <span>Export</span>
          </button>

          {isExporting && (
            <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-medium mb-4 text-center">
                  Preparing Excel Export
                </h3>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>

                {/* Percentage and spinner */}
                <div className="flex items-center justify-center space-x-3">
                  <div className="text-gray-700 font-medium">
                    {progress}% Complete
                  </div>
                  <div className="animate-spin">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            className={`flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${
              subscriber?.request_status === "pending" ||
              subscriber?.status === "Suspended" ||
              subscriber?.status === "Modified"
                ? "cursor-not-allowed"
                : "cursor-pointer"
            }`}
            onClick={handleOpenNewPaymentForm}
            disabled={
              subscriber?.request_status === "pending" ||
              subscriber?.status === "Suspended" ||
              subscriber?.status === "Modified"
            }
          >
            <FiPlus /> <span className="">Add Payment</span>
          </button>
        </div>
      </div>

      {/* Mobile Table Container */}
      <div className="relative">
        <div className="overflow-x-auto hide-scrollbar">
          {/* Table */}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-500">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("transactionId")}
                >
                  <div className="flex items-center">
                    ID {getSortIcon("transactionId")}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider">
                  <div className="flex items-center">Duration</div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("transactionType")}
                >
                  <div className="flex items-center">
                    Type {getSortIcon("transactionType")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("amount")}
                >
                  <div className="flex items-center">
                    Amount {getSortIcon("amount")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider"
                  onClick={() => requestSort("transactionDate")}
                >
                  <div className="flex items-center">
                    Transaction Info {getSortIcon("transactionDate")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("status")}
                >
                  <div className="flex items-center">
                    Status {getSortIcon("status")}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-gray-500">
                    <NoData
                      title="No Payments Found"
                      description="Try adjusting your search or filters"
                    />
                  </td>
                </tr>
              ) : (
                currentItems.map((payment) => (
                  <React.Fragment key={payment?._id}>
                    <tr
                      key={payment?._id}
                      className="hover:bg-gray-200 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <span className="font-semibold">
                            {payment?.transactionId}
                          </span>
                        </div>
                      </td>
                      <td className="px-0 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="px-4 py-3 whitespace-nowrap flex flex-col items-center text-sm text-gray-900">
                            <span>{formatDate(payment?.activationDate)}</span>
                            {"to"}
                            <span>{formatDate(payment?.expiryDate)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold leading-5 ${
                            payment?.transactionType === "Income"
                              ? "bg-green-100 text-green-800" // Green for Income
                              : payment?.transactionType === "Expense"
                              ? "bg-rose-100 text-rose-800" // Rose/deep pink for Expense
                              : "bg-gray-100 text-gray-800" // Default fallback
                          }`}
                        >
                          {payment?.transactionType}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex-center flex-col">
                          <span className="text-gray-900 sm:text-sm">
                            ₹ {payment?.amount}
                          </span>
                          <span>{payment?.transactionMode}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex-center flex-col relative">
                          <span>{formatDate(payment?.transactionDate)}</span>
                          <span
                            className="underline cursor-pointer text-blue-500"
                            onMouseEnter={() => {
                              setHoveredUser({
                                modifiedBy: payment?.created_by,
                                paymentId: payment?._id,
                              });
                            }}
                            onMouseLeave={() =>
                              setHoveredUser({
                                modifiedBy: null,
                                paymentId: null,
                              })
                            }
                          >
                            {payment.created_by.name}
                          </span>
                          {/* Hover Card */}
                          {hoveredUser?.modifiedBy?._id ===
                            payment?.created_by?._id &&
                            hoveredUser?.paymentId === payment?._id && (
                              <UserHoverCard userData={hoveredUser} />
                            )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold leading-5 ${
                            payment?.status === "Paid"
                              ? "bg-green-100 text-green-800" // Green for Paid
                              : payment?.status === "Received"
                              ? "bg-green-800/80 text-green-100" // Yellow for Received
                              : payment?.status === "Refunding"
                              ? "bg-blue-100 text-blue-800" // Blue for Refunding
                              : payment?.status === "Rejected"
                              ? "bg-rose-100 text-rose-800" // Rose/deep pink for Rejected
                              : payment?.status === "Deleted"
                              ? "bg-gray-200 text-gray-800" // Gray for Deleted
                              : payment?.status === "Modified"
                              ? "bg-amber-100 text-amber-800" // Amber/orange for Modified
                              : "bg-gray-100 text-gray-800" // Default fallback
                          }`}
                        >
                          {payment?.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          {payment?.request_status !== "pending" &&
                            payment?.transactionType === "Income" && (
                              <button
                                className="p-1.5 text-blue-600 hover:bg-blue-500 hover:text-white rounded-md transition-colors"
                                title="Edit"
                                onClick={() =>
                                  handleOpenUpdatePaymentForm(payment?._id)
                                }
                              >
                                <FiEdit className="h-5 w-5" />
                              </button>
                            )}

                          {payment?.request_status !== "pending" &&
                            payment?.transactionType === "Expense" &&
                            payment?.status !== "Refunded" &&
                            payment?.status !== "Rejected" && (
                              <button
                                className="p-1.5 text-rose-600 hover:bg-rose-500 hover:text-white rounded-md transition-colors"
                                title="Refund"
                                onClick={async () => {
                                  await refundPaymentAPI(
                                    payment?._id,
                                    payment?.status
                                  )
                                    .then((res) => {
                                      setSubmissionStatus({
                                        type: "success",
                                        message:
                                          res?.message ??
                                          "Refunding in process...",
                                      });
                                    })
                                    .finally(() => {
                                      refetch();
                                    });
                                }}
                              >
                                <HiOutlineReceiptRefund className="h-5 w-5" />
                              </button>
                            )}

                          {DecisionMaker &&
                            payment?.request_status === "pending" && (
                              <>
                                <button
                                  className="p-1.5 text-green-600 hover:bg-green-500 hover:text-white rounded-md transition-colors"
                                  title="Approve"
                                  onClick={async () => {
                                    if (payment?.status === "Refunding") {
                                      const confirmRefund = window.confirm(
                                        "Are you sure this payment is Refunded? This action cannot be undone."
                                      );

                                      if (!confirmRefund) return;

                                      try {
                                        handleApprove(
                                          payment?._id,
                                          payment?.status,
                                          payment
                                        );
                                      } catch (error) {
                                        setSubmissionStatus({
                                          type: "error",
                                          message: "Failed to process refund",
                                        });
                                      }
                                    } else {
                                      handleApprove(
                                        payment?._id,
                                        payment?.status,
                                        payment
                                      );
                                    }
                                  }}
                                  disabled={loadingApprove === payment?._id}
                                >
                                  {loadingApprove === payment?._id ? (
                                    <Loader className="h-5 w-5 animate-spin" />
                                  ) : (
                                    <FiCheck className="h-5 w-5" />
                                  )}
                                </button>
                                <button
                                  className="p-1.5 text-red-600 hover:bg-red-500 hover:text-white rounded-md transition-colors"
                                  title="Reject"
                                  onClick={() =>
                                    handleReject(
                                      payment?._id,
                                      payment?.status,
                                      payment
                                    )
                                  }
                                  disabled={loadingReject === payment._id}
                                >
                                  {loadingReject === payment._id ? (
                                    <Loader className="h-5 w-5 animate-spin" />
                                  ) : (
                                    <FiX className="h-5 w-5" />
                                  )}
                                </button>
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                    {/* Add this row for Modified status remarks */}
                    {payment.status === "Modified" && (
                      <tr>
                        <td colSpan="7" className="px-4 py-3 bg-yellow-50">
                          <div className="space-y-3">
                            {/* Remarks Section */}
                            {payment.remark && (
                              <div className="flex items-start">
                                <span className="text-yellow-600 mr-2">📝</span>
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Remarks:</span>{" "}
                                  {payment.remark}
                                </div>
                              </div>
                            )}

                            {/* Modified Data Section */}
                            {payment.modifiedData && (
                              <div className="border-t border-yellow-200 pt-3">
                                <div className="flex items-start mb-2">
                                  <span className="text-yellow-600 mr-2">
                                    🔄
                                  </span>
                                  <span className="text-sm font-medium text-gray-700">
                                    Changes:
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  {/* Previous Data */}
                                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-1 mb-1">
                                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                      <h3 className="font-medium text-gray-700 text-sm">
                                        Previous
                                      </h3>
                                    </div>
                                    <div className="space-y-1">
                                      {Object.entries(
                                        payment.modifiedData.previous
                                      ).map(([key, value]) => {
                                        // Handle nested objects
                                        if (
                                          typeof value === "object" &&
                                          value !== null &&
                                          !Array.isArray(value)
                                        ) {
                                          return (
                                            <div
                                              key={`prev-${key}`}
                                              className="text-sm"
                                            >
                                              <div className="flex items-baseline">
                                                <span className="inline-block min-w-[60px] text-gray-500 capitalize truncate">
                                                  {getDisplayName(key)}:
                                                </span>
                                                <div className="flex-1 ml-1">
                                                  {Object.entries(value).map(
                                                    ([
                                                      nestedKey,
                                                      nestedValue,
                                                    ]) => (
                                                      <div
                                                        key={`prev-nested-${nestedKey}`}
                                                        className="mb-1 last:mb-0"
                                                      >
                                                        <div className="flex items-baseline">
                                                          <span className="inline-block min-w-[40px] text-gray-400 text-[10px] capitalize">
                                                            {getDisplayName(
                                                              nestedKey
                                                            )}
                                                            :
                                                          </span>
                                                          <span className="text-gray-700 ml-1 break-words">
                                                            {nestedValue || (
                                                              <span className="text-gray-400">
                                                                (empty)
                                                              </span>
                                                            )}
                                                          </span>
                                                        </div>
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }

                                        // Handle regular values
                                        return (
                                          <div
                                            key={`prev-${key}`}
                                            className="text-sm"
                                          >
                                            <div className="flex items-baseline">
                                              <span className="inline-block min-w-[60px] text-gray-500 capitalize truncate">
                                                {getDisplayName(key)}:
                                              </span>
                                              <div className="flex-1 ml-1">
                                                {Array.isArray(value) ? (
                                                  <div className="flex flex-wrap gap-0.5">
                                                    {value.map((item, i) => (
                                                      <span
                                                        key={i}
                                                        className="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold break-words"
                                                      >
                                                        {item}
                                                      </span>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <span className="text-gray-700 break-words">
                                                    {value || (
                                                      <span className="text-gray-400">
                                                        (empty)
                                                      </span>
                                                    )}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Current Data */}
                                  <div className="bg-blue-100 p-2 rounded-lg border border-blue-200">
                                    <div className="flex items-center gap-1 mb-1">
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                      <h3 className="font-medium text-blue-700 text-sm">
                                        New
                                      </h3>
                                    </div>
                                    <div className="space-y-1">
                                      {Object.entries(
                                        payment.modifiedData.current
                                      ).map(([key, value]) => {
                                        const previousValue =
                                          payment.modifiedData.previous[key];
                                        const hasChanged =
                                          JSON.stringify(value) !==
                                          JSON.stringify(previousValue);

                                        // Handle nested objects differently
                                        if (
                                          typeof value === "object" &&
                                          value !== null &&
                                          !Array.isArray(value)
                                        ) {
                                          return (
                                            <div
                                              key={`curr-${key}`}
                                              className="text-sm"
                                            >
                                              <div className="flex items-baseline">
                                                <span className="inline-block min-w-[60px] text-blue-600 capitalize truncate">
                                                  {getDisplayName(key)}:
                                                </span>
                                                <div className="flex-1 ml-1">
                                                  {Object.entries(value).map(
                                                    ([
                                                      nestedKey,
                                                      nestedValue,
                                                    ]) => {
                                                      const prevNestedValue =
                                                        previousValue?.[
                                                          nestedKey
                                                        ];
                                                      const nestedHasChanged =
                                                        JSON.stringify(
                                                          nestedValue
                                                        ) !==
                                                        JSON.stringify(
                                                          prevNestedValue
                                                        );

                                                      return (
                                                        <div
                                                          key={`nested-${nestedKey}`}
                                                          className="mb-1 last:mb-0"
                                                        >
                                                          <div className="flex items-baseline">
                                                            <span className="inline-block min-w-[40px] text-blue-500 text-[10px] capitalize">
                                                              {getDisplayName(
                                                                nestedKey
                                                              )}
                                                              :
                                                            </span>
                                                            <span
                                                              className={`text-blue-900 ml-1 break-words ${
                                                                nestedHasChanged
                                                                  ? "bg-green-600 px-1 rounded-md text-white font-semibold"
                                                                  : "text-blue-900"
                                                              }`}
                                                            >
                                                              {nestedValue || (
                                                                <span className="text-gray-400">
                                                                  (empty)
                                                                </span>
                                                              )}
                                                            </span>
                                                          </div>
                                                        </div>
                                                      );
                                                    }
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }

                                        // Handle regular values
                                        return (
                                          <div
                                            key={`curr-${key}`}
                                            className="text-sm"
                                          >
                                            <div className="flex items-baseline">
                                              <span className="inline-block min-w-[60px] text-blue-600 capitalize truncate">
                                                {getDisplayName(key)}:
                                              </span>
                                              <div className="flex-1 ml-1">
                                                {Array.isArray(value) ? (
                                                  <div className="flex flex-wrap gap-0.5">
                                                    {value.map((item, i) => (
                                                      <span
                                                        key={i}
                                                        className="bg-blue-50 text-blue-900 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                                      >
                                                        {item}
                                                      </span>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <span
                                                    className={`text-blue-900 break-words ${
                                                      hasChanged
                                                        ? "bg-green-600 px-2 rounded-xl text-white font-semibold"
                                                        : "text-blue-900"
                                                    }`}
                                                  >
                                                    {value || (
                                                      <span className="text-gray-400">
                                                        (empty)
                                                      </span>
                                                    )}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>

                                {/* Metadata */}
                                <div className="mt-3 text-xs text-gray-500 relative">
                                  <span
                                    className="hover:underline cursor-pointer"
                                    onMouseEnter={() =>
                                      setHoveredUser({
                                        modifiedBy:
                                          payment.modifiedData.modified_by,
                                        employeeId: payment._id,
                                      })
                                    }
                                    onMouseLeave={() =>
                                      setHoveredUser({
                                        modifiedBy: null,
                                        employeeId: null,
                                      })
                                    }
                                  >
                                    Modified by:{" "}
                                    <span className="text-blue-500 underline">
                                      {payment?.modifiedData?.modified_by
                                        ?.name || "Unknown"}
                                    </span>
                                  </span>
                                  <span className="mx-2">•</span>
                                  <span>
                                    {new Date(
                                      payment.modifiedData.modified_at
                                    ).toLocaleString()}
                                  </span>

                                  {/* Hover Card */}
                                  {hoveredUser?.modifiedBy?._id ===
                                    payment?.modifiedData?.modified_by?._id &&
                                    hoveredUser?.employeeId ===
                                      payment?._id && (
                                      <UserHoverCard userData={hoveredUser} />
                                    )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {processedPayments.length > 0 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 rounded-b-lg shadow-sm sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 mx-4 flex items-center">
              {/* Page {currentPage} of {totalPages} */}
              <div>
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, processedPayments.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">
                    {processedPayments.length}
                  </span>{" "}
                  results
                </p>
              </div>
            </span>
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                currentPage === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Next
            </button>
          </div>

          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(indexOfLastItem, processedPayments.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium">{processedPayments.length}</span>{" "}
                results
              </p>
            </div>
            <div>
              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                    currentPage === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <FiChevronLeft className="h-5 w-5" />
                </button>

                {/* Page numbers */}
                {(() => {
                  const pages = [];
                  const maxVisiblePages = 5;
                  let startPage, endPage;

                  if (totalPages <= maxVisiblePages) {
                    startPage = 1;
                    endPage = totalPages;
                  } else {
                    const maxPagesBeforeCurrent = Math.floor(
                      maxVisiblePages / 2
                    );
                    const maxPagesAfterCurrent =
                      Math.ceil(maxVisiblePages / 2) - 1;

                    if (currentPage <= maxPagesBeforeCurrent) {
                      startPage = 1;
                      endPage = maxVisiblePages;
                    } else if (
                      currentPage + maxPagesAfterCurrent >=
                      totalPages
                    ) {
                      startPage = totalPages - maxVisiblePages + 1;
                      endPage = totalPages;
                    } else {
                      startPage = currentPage - maxPagesBeforeCurrent;
                      endPage = currentPage + maxPagesAfterCurrent;
                    }
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => paginate(i)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === i
                            ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  return pages;
                })()}

                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                    currentPage === totalPages
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <FiChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentEntriesTable;
