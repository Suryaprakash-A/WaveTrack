import React, { useCallback, useEffect } from "react";
import { useState } from "react";
import { Loader } from "lucide-react";
import * as XLSX from "xlsx";
import {
  approvePaymentAPI,
  getPaymentsAPI,
  refundPaymentAPI,
  rejectPaymentAPI,
} from "../../services/paymentServices";
import { useQuery } from "@tanstack/react-query";
import {
  FiFilter,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiX,
  FiEdit,
  FiUpload,
} from "react-icons/fi";
import { HiOutlineReceiptRefund } from "react-icons/hi";
import NoData from "../../components/NoData";
import Toast from "../../components/Toast";
import { hasPermission } from "../../utils/auth";
import { getUserRoles } from "../../utils/jwt";
import { useLocation, useNavigate } from "react-router-dom";
import UserHoverCard from "../../components/UserHoverCard";
import UpdatePaymentForm from "../SubscriberManagement/Subscriber/Payments/UpdatePaymentForm";

const AllPaymentsPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const userRoles = getUserRoles();
  const DecisionMaker = hasPermission(
    ["Admin", "General Manager", "Manager", "Finance"],
    userRoles
  );

  const hasDeletePermission = hasPermission(
    ["Admin", "General Manager"],
    userRoles
  );

  const [loadingApprove, setLoadingApprove] = useState(null);
  const [loadingReject, setLoadingReject] = useState(null);
  const [isManualRefetching, setIsManualRefetching] = useState(false);

  const [hoveredUser, setHoveredUser] = useState({
    modifiedBy: null,
    paymentId: null,
  });

  const [submissionStatus, setSubmissionStatus] = useState(null);

  const [allSelectedPending, setAllSelectedPending] = useState(false);

  const [selectedRows, setSelectedRows] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [filters, setFilters] = useState({
    status: "",
    startDate: "",
    endDate: "",
  });
  const [activeFilters, setActiveFilters] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const {
    data: payments,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryFn: getPaymentsAPI,
    queryKey: ["getPayments"],
    refetchOnWindowFocus: true,
  });

  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [isUpdatePaymentFormOpen, setIsUpdatePaymentFormOpen] = useState(false);

  const handleOpenUpdatePaymentForm = async (id) => {
    setSelectedPaymentId(id);
    setIsUpdatePaymentFormOpen(true);
  };

  const handleCloseUpdatePaymentForm = () => {
    setSelectedPaymentId(null);
    refetch();
    setIsUpdatePaymentFormOpen(false);
  };

  // Create a refetch function that we can call when the page is navigated to
  const forceRefetch = useCallback(async () => {
    setIsManualRefetching(true);
    try {
      await refetch();
    } finally {
      setIsManualRefetching(false);
    }
  }, [refetch]);

  // Detect when the page is navigated to and refetch
  useEffect(() => {
    // This will run whenever the location (route) changes
    forceRefetch();
  }, [location.pathname, forceRefetch]);

  // Filter and sort employees
  const processedPayments = React.useMemo(() => {
    if (!payments?.data) return [];

    let result = [...payments.data];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (payment) =>
          payment?.subscriberId?.siteAddress?.toLowerCase().includes(term) ||
          payment?.subscriberId?.siteCode.toLowerCase().includes(term) ||
          payment?.subscriberId?.siteName.toLowerCase().includes(term) ||
          payment.amount.includes(term)
      );
    }

    // Apply filters
    if (filters.status) {
      result = result.filter((payment) => payment.status === filters.status);
    }

    // Apply date range filter
    if (filters.startDate || filters.endDate) {
      result = result.filter((payment) => {
        const paymentDate = new Date(payment?.transactionDate?.split("T")[0]);
        const startDate = filters.startDate
          ? new Date(filters.startDate)
          : null;
        const endDate = filters.endDate ? new Date(filters.endDate) : null;

        // Set time to midnight for proper comparison
        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);

        const afterStart = !startDate || paymentDate >= startDate;
        const beforeEnd = !endDate || paymentDate <= endDate;

        return afterStart && beforeEnd;
      });
    }

    const getNestedValue = (obj, path) =>
      path.split(".").reduce((o, k) => o?.[k] ?? "", obj);

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        // First sort by selection status (selected rows first)
        const aSelected = selectedRows?.map((row) => row.id).includes(a._id);
        const bSelected = selectedRows?.map((row) => row.id).includes(b._id);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;

        // First sort by request_status (pending first)
        if (a.request_status === "pending" && b.request_status !== "pending") {
          return -1;
        }
        if (a.request_status !== "pending" && b.request_status === "pending") {
          return 1;
        }

        const aVal = getNestedValue(a, sortConfig.key);
        const bVal = getNestedValue(b, sortConfig.key);

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortConfig.direction === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return 0;
      });
    } else {
      // Default sort: pending first, then by createdAt (newest first)
      result.sort((a, b) => {
        // First sort by selection status (selected rows first)
        const aSelected = selectedRows?.map((row) => row.id).includes(a._id);
        const bSelected = selectedRows?.map((row) => row.id).includes(b._id);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;

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
  }, [payments, searchTerm, filters, sortConfig, currentPage]);

  const totalRevenue = processedPayments
    ?.filter((p) => p.transactionType === "Income" && p.status !== "Rejected")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = processedPayments
    ?.filter(
      (p) =>
        p.transactionType === "Expense" &&
        p.status !== "Rejected" &&
        p.status !== "Refunded"
    )
    .reduce((sum, p) => sum + Number(p.amount), 0);

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

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (filters.status) count++;
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
    setFilters({ status: "", startDate: "", endDate: "" });
    setSearchTerm("");
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? <FiChevronUp /> : <FiChevronDown />;
  };

  const handleSelectRow = (e, id, status, payment) => {
    if (e.target.checked) {
      setSelectedRows([...selectedRows, { id, status, payment }]);
    } else {
      setSelectedRows(selectedRows.filter((row) => row.id !== id));
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(
        processedPayments.map((item) => ({
          id: item._id,
          status: item.status,
          payment: item,
        }))
      );
    } else {
      setSelectedRows([]);
    }
  };

  useEffect(() => {
    const allPending =
      selectedRows.length > 0 &&
      selectedRows.every(
        (row) =>
          row.payment?.request_status === "pending" && row.status !== "Modified"
      );
    setAllSelectedPending(allPending);
  }, [selectedRows]);

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

  const handleRowClick = (id) => {
    navigate(`/subscriber/${id}`);
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
      const dataToExport =
        selectedRows.length > 0
          ? selectedRows.map((row) => row.payment)
          : processedPayments;

      if (!dataToExport || dataToExport.length === 0) {
        alert("No data available to export");
        return;
      }

      setProgress(50);

      // Prepare the worksheet data
      const worksheetData = dataToExport.map((payment) => ({
        "Site Code": payment?.subscriberId?.siteCode,
        "Site Name": payment?.subscriberId?.siteName,
        Address: payment?.subscriberId?.siteAddress,
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
      XLSX.utils.book_append_sheet(workbook, worksheet, "All Payments");

      setProgress(90);

      // Generate Excel file and trigger download
      const fileName =
        selectedRows.length > 0
          ? `Selected_Subscribers_${
              new Date().toISOString().split("T")[0]
            }.xlsx`
          : `All_Subscribers_${new Date().toISOString().split("T")[0]}.xlsx`;

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

  if (isManualRefetching) {
    return (
      <div className="flex justify-center py-8">
        <Loader className="animate-spin h-6 w-6 text-blue-600 mx-auto" />
      </div>
    );
  }

  if (isLoading)
    return <div className="flex justify-center py-8">Loading...</div>;
  if (error)
    return (
      <div className="text-red-500 text-center py-8">
        Error: {error.message}
      </div>
    );

  return (
    <div className="min-h-fit">
      {isUpdatePaymentFormOpen && (
        <UpdatePaymentForm
          id={selectedPaymentId}
          handleClose={handleCloseUpdatePaymentForm}
        />
      )}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        {submissionStatus && (
          <Toast
            type={submissionStatus.type}
            message={submissionStatus.message}
            onClose={() => setSubmissionStatus(null)}
          />
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 whitespace-nowrap">
            Payment Directory
          </h2>

          <div className="flex items-center gap-3 w-full sm:w-auto relative">
            <button
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              onClick={exportToExcel}
              disabled={isExporting}
            >
              <FiUpload />
              {selectedRows.length > 0
                ? `Export Selected (${selectedRows.length})`
                : isExporting
                ? "Exporting..."
                : "Export"}
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

            {/* Search with advanced filter dropdown */}
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search payments..."
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
                className="hidden absolute left-0 sm:left-auto sm:right-0 mt-1 w-full sm:w-80 bg-white rounded-md shadow-lg z-20 p-3 border"
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
                      <option value="Modified">Modified</option>
                      <option value="Refunding">Refunding</option>
                      <option value="Refunded">Refunded</option>
                      <option value="Rejected">Rejected</option>
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Operation Features - Responsive */}

        {/* Payments List Table */}
        <div className="hidden sm:block bg-white shadow-xl rounded-xl overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 align-middle">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-500">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider"
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedRows.length === processedPayments.length &&
                      processedPayments.length > 0
                    }
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("transactionId")}
                >
                  <div className="flex items-center gap-1">
                    ID
                    {getSortIcon("transactionId")}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider"
                >
                  <div className="flex items-center gap-1">Site Info</div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider"
                >
                  Duration
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("transactionType")}
                >
                  <div className="flex items-center gap-1">
                    Type
                    {getSortIcon("transactionType")}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider"
                >
                  <div className="flex items-center gap-1">Amount</div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("transactionDate")}
                >
                  <div className="flex items-center gap-1">
                    Transaction Info
                    {getSortIcon("transactionDate")}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("status")}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {getSortIcon("status")}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-6 text-gray-500">
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
                      className={
                        selectedRows?.map((row) => row.id).includes(payment._id)
                          ? "bg-blue-100"
                          : "hover:bg-gray-50"
                      }
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={selectedRows
                            ?.map((row) => row.id)
                            .includes(payment._id)}
                          onChange={(e) =>
                            handleSelectRow(
                              e,
                              payment._id,
                              payment.status,
                              payment
                            )
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>

                      {/* ID */}
                      <td
                        className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 hover:text-blue-600 hover:cursor-pointer hover:underline"
                        onClick={() =>
                          handleRowClick(payment?.subscriberId?._id)
                        }
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900 hover:text-blue-600">
                            {payment?.transactionId}
                          </span>
                        </div>
                      </td>

                      {/* Site Info */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900">
                            {payment?.subscriberId?.siteCode} •{" "}
                            {payment?.subscriberId?.siteName}
                          </span>
                          <span className="text-xs text-gray-500 truncate max-w-[180px]">
                            {payment?.subscriberId?.siteAddress}
                          </span>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col justify-center">
                          <span className="text-sm text-gray-900">
                            {payment?.activationDate?.split("T")[0]}
                          </span>
                          <span className="text-xs text-gray-500">to</span>
                          <span className="text-sm text-gray-900">
                            {payment?.expiryDate?.split("T")[0]}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
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

                      {/* Amount */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            ₹{payment?.amount}
                          </span>
                          <span className="text-xs text-gray-500">
                            {payment?.transactionMode}
                          </span>
                        </div>
                      </td>

                      {/* Transaction Info */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col relative">
                          <span className="text-sm text-gray-900">
                            {payment?.transactionDate?.split("T")[0]}
                          </span>
                          <span
                            className="underline cursor-pointer text-xs text-blue-500"
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
                            {payment?.created_by?.name}
                          </span>
                          {/* Hover Card */}
                          {hoveredUser?.modifiedBy?._id ===
                            payment?.created_by?._id &&
                            hoveredUser?.paymentId === payment?._id && (
                              <UserHoverCard userData={hoveredUser} />
                            )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 inline-flex text-xs leading-4 font-medium rounded-full
                ${
                  payment?.status === "Paid"
                    ? "bg-green-100 text-green-800"
                    : payment?.status === "Received"
                    ? "bg-green-800 text-green-100"
                    : payment?.status === "Refunding"
                    ? "bg-blue-100 text-blue-800"
                    : payment?.status === "Rejected"
                    ? "bg-rose-100 text-rose-800"
                    : payment?.status === "Deleted"
                    ? "bg-gray-200 text-gray-800"
                    : payment?.status === "Modified"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-gray-100 text-gray-800"
                }`}
                        >
                          {payment.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-1">
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
                            payment.request_status === "pending" && (
                              <>
                                <button
                                  className="p-1.5 text-green-600 hover:bg-green-500 hover:text-white rounded-md transition-colors"
                                  title="Approve"
                                  disabled={loadingApprove === payment._id}
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

                    {/* Modified Status Section */}
                    {payment.status === "Modified" && (
                      <tr>
                        <td colSpan="9" className="px-4 py-3 bg-yellow-50">
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

        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-4">
          {currentItems.length === 0 ? (
            <div className="p-6 text-center">
              <NoData
                title="No Payments Found"
                description="Try adjusting your search or filters"
              />
            </div>
          ) : (
            currentItems.map((payment) => (
              <div
                key={payment?._id}
                className={`bg-white rounded-xl shadow-md overflow-hidden border-l-4 ${
                  payment?.status === "Paid"
                    ? "border-green-500"
                    : payment?.status === "Received"
                    ? "border-green-700"
                    : payment?.status === "Refunding"
                    ? "border-blue-500"
                    : payment?.status === "Rejected"
                    ? "border-rose-500"
                    : payment?.status === "Deleted"
                    ? "border-gray-400"
                    : payment?.status === "Modified"
                    ? "border-amber-500"
                    : "border-gray-300"
                }`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedRows
                        ?.map((row) => row.id)
                        .includes(payment._id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectRow(
                          e,
                          payment._id,
                          payment.status,
                          payment
                        );
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {payment.subscriber_id || payment?.transactionId}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {payment?.transactionType}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-medium rounded-full
              ${
                payment?.status === "Paid"
                  ? "bg-green-100 text-green-800"
                  : payment?.status === "Received"
                  ? "bg-green-800 text-green-100"
                  : payment?.status === "Refunding"
                  ? "bg-blue-100 text-blue-800"
                  : payment?.status === "Rejected"
                  ? "bg-rose-100 text-rose-800"
                  : payment?.status === "Deleted"
                  ? "bg-gray-200 text-gray-800"
                  : payment?.status === "Modified"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-gray-100 text-gray-800"
              }`}
                  >
                    {payment.status}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Site Code
                      </p>
                      <p className="text-sm text-gray-900">
                        {payment?.subscriberId?.siteCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Amount
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        ₹{payment?.amount} ({payment?.transactionMode})
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      Duration
                    </p>
                    <p className="text-sm text-gray-900">
                      {payment?.activationDate?.split("T")[0]} to{" "}
                      {payment?.expiryDate?.split("T")[0]}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      Site Info
                    </p>
                    <p className="text-sm text-gray-900">
                      {payment?.subscriberId?.siteName} -{" "}
                      {payment?.subscriberId?.siteAddress}
                    </p>
                  </div>

                  <div className="flex items-center">
                    <p className="text-xs font-medium text-gray-500 mr-4">
                      Transaction Info
                    </p>
                    <div className="flex flex-col relative text-sm">
                      <span className="text-sm text-gray-900">
                        {payment?.transactionDate?.split("T")[0]}
                      </span>
                      <span
                        className="underline cursor-pointer text-xs text-blue-500"
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
                        {payment?.created_by?.name}
                      </span>
                      {/* Hover Card */}
                      {hoveredUser?.modifiedBy?._id ===
                        payment?.created_by?._id &&
                        hoveredUser?.paymentId === payment?._id && (
                          <UserHoverCard userData={hoveredUser} />
                        )}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
                  <button
                    onClick={() => handleRowClick(payment?.subscriberId?._id)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    View Details
                  </button>

                  <div className="flex space-x-2">
                    {payment?.request_status !== "pending" &&
                      payment?.transactionType === "Income" && (
                        <button
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Edit"
                          onClick={() =>
                            handleOpenUpdatePaymentForm(payment?._id)
                          }
                        >
                          <FiEdit className="h-4 w-4" />
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
                                    res?.message ?? "Refunding in process",
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
                    {DecisionMaker && payment.request_status === "pending" && (
                      <>
                        <button
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
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
                          disabled={loadingApprove === payment._id}
                        >
                          {loadingApprove === payment._id ? (
                            <Loader className="h-4 w-4 animate-spin" />
                          ) : (
                            <FiCheck className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                          title="Reject"
                          onClick={() =>
                            handleReject(payment?._id, payment?.status, payment)
                          }
                          disabled={loadingReject === payment._id}
                        >
                          {loadingReject === payment._id ? (
                            <Loader className="h-4 w-4 animate-spin" />
                          ) : (
                            <FiX className="h-4 w-4" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Modified Status Remarks (expanded view) */}
                {payment.status === "Modified" && (
                  <div className="px-4 py-3 bg-yellow-50 flex justify-between items-center">
                    <div className="space-y-3 w-full">
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
                            <span className="text-yellow-600 mr-2">🔄</span>
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
                                              ([nestedKey, nestedValue]) => (
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
                                              ([nestedKey, nestedValue]) => {
                                                const prevNestedValue =
                                                  previousValue?.[nestedKey];
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
                                  modifiedBy: payment.modifiedData.modified_by,
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
                                {payment?.modifiedData?.modified_by?.name ||
                                  "Unknown"}
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
                              hoveredUser?.employeeId === payment?._id && (
                                <UserHoverCard userData={hoveredUser} />
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {processedPayments.length > 0 && (
          <div className="mt-6 bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 rounded-b-lg shadow-sm sm:px-6">
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
                    <span className="font-medium">{indexOfFirstItem + 1}</span>{" "}
                    to{" "}
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
                  <span className="font-medium">
                    {processedPayments.length}
                  </span>{" "}
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-gray-500 text-sm font-medium">Total Income</h3>
            <p className="text-2xl font-bold text-gray-800">
              ₹ {totalRevenue.toLocaleString()}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
            <h3 className="text-gray-500 text-sm font-medium">Total Expense</h3>
            <p className="text-2xl font-bold text-gray-800">
              ₹ {totalExpenses.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllPaymentsPanel;
