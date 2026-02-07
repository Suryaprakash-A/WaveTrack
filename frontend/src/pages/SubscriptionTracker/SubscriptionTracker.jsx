import React, { useCallback, useEffect } from "react";
import { useState } from "react";
import { Loader } from "lucide-react";
import * as XLSX from "xlsx";
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
import { getSubscribersAPI } from "../../services/subscriberServices";
import { sub } from "date-fns";

const SubscriptionTracker = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const userRoles = getUserRoles();
  const DecisionMaker = hasPermission(
    ["Admin", "General Manager", "Manager", "Senior HR"],
    userRoles
  );

  const hasDeletePermission = hasPermission(
    ["Admin", "General Manager"],
    userRoles
  );

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
  });
  const [activeFilters, setActiveFilters] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [upcomingDays, setUpcomingDays] = useState(7);

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };
  const handleUpcomingDaysChange = (e) => {
    setUpcomingDays(Number(e.target.value));
    setCurrentPage(1);
  };

  const {
    data: subscribers,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryFn: getSubscribersAPI,
    queryKey: ["getSubscribers"],
    refetchOnWindowFocus: true,
  });

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

  const processedSubscribers = React.useMemo(() => {
    if (!subscribers?.data) return [];

    let result = [...subscribers.data];

    // Filter by renewal date (past or within upcomingDays)
    if (upcomingDays !== undefined) {
      // Check if upcomingDays is defined (could be 0)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day

      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + upcomingDays);

      result = result.filter((subscriber) => {
        if (
          !subscriber?.ispInfo?.renewalDate ||
          subscriber.status === "Suspended"
        )
          return false;

        const renewalDate = new Date(subscriber.ispInfo.renewalDate);
        renewalDate.setHours(0, 0, 0, 0); // Normalize to start of day

        // Show if renewal date is past OR within upcoming days
        return renewalDate <= futureDate;
      });
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (subscriber) =>
          subscriber?.subscriber_id?.toLowerCase().includes(term) ||
          subscriber?.siteAddress?.toLowerCase().includes(term) ||
          subscriber?.siteCode.toLowerCase().includes(term) ||
          subscriber?.siteName.toLowerCase().includes(term) ||
          subscriber?.ispInfo?.broadbandPlan.toLowerCase().includes(term)
      );
    }

    // Apply filters
    if (filters.status) {
      result = result.filter(
        (subscriber) => subscriber.status === filters.status
      );
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
      result.sort((a, b) => {
        // First sort by selection status (selected rows first)
        const aSelected = selectedRows?.map((row) => row.id).includes(a._id);
        const bSelected = selectedRows?.map((row) => row.id).includes(b._id);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;

        // Then by createdAt (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    return result;
  }, [subscribers, searchTerm, filters, sortConfig, currentPage, upcomingDays]);

  // Get current items
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedSubscribers.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(processedSubscribers.length / itemsPerPage);

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
    setFilters({ status: "" });
    setSearchTerm("");
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? <FiChevronUp /> : <FiChevronDown />;
  };

  const handleSelectRow = (e, id, status, subscriber) => {
    if (e.target.checked) {
      setSelectedRows([...selectedRows, { id, status, subscriber }]);
    } else {
      setSelectedRows(selectedRows.filter((row) => row.id !== id));
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(
        processedSubscribers.map((item) => ({
          id: item._id,
          status: item.status,
          subscriber: item,
        }))
      );
    } else {
      setSelectedRows([]);
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
          ? selectedRows.map((row) => row.subscriber)
          : processedSubscribers;

      if (!dataToExport || dataToExport.length === 0) {
        alert("No data available to export");
        return;
      }

      setProgress(50);

      // Prepare the worksheet data
      const worksheetData = dataToExport.map((subscriber) => ({
        "Subscriber ID": subscriber.subscriber_id,
        "Site Name": subscriber.siteName,
        "Site Code": subscriber.siteCode,
        Address: subscriber.siteAddress,
        "LC Name": subscriber.localContact?.name || "",
        "LC Contact": subscriber.localContact?.contact || "",
        "ISP Name": subscriber.ispInfo?.name || "",
        "ISP Contact": subscriber.ispInfo?.contact || "",
        Plan: subscriber.ispInfo?.broadbandPlan || "",
        "MRC (₹)": subscriber.ispInfo?.mrc || "",
        "OTC (₹)": subscriber.ispInfo?.otc || "",
        Status: subscriber.status,
        "Delivery Date": subscriber.activationDate?.split("T")[0] || "",
        "Activation Date":
          subscriber.ispInfo?.currentActivationDate?.split("T")[0] || "",
        "Renewal Date": subscriber.ispInfo?.renewalDate?.split("T")[0] || "",
      }));

      setProgress(70);

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Upcoming Renewals");

      setProgress(90);

      // Generate Excel file and trigger download
      const fileName =
        selectedRows.length > 0
          ? `Selected_UpComing_Renewals_${upcomingDays}Days_${
              new Date().toISOString().split("T")[0]
            }.xlsx`
          : `All_UpComing_Renewals_${upcomingDays}Days_${
              new Date().toISOString().split("T")[0]
            }.xlsx`;

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
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        {submissionStatus && (
          <Toast
            type={submissionStatus.type}
            message={submissionStatus.message}
            onClose={() => setSubmissionStatus(null)}
          />
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex flex-col items-center md:items-start gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 whitespace-nowrap">
              Live Tracker
            </h2>
            <p>( List of Upcoming Renewals within {upcomingDays} days )</p>
          </div>

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
                placeholder="Search subscribers..."
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
                      <option value="Active">Active</option>
                      <option value="InActive">InActive</option>
                    </select>
                  </div>

                  <div className="w-full">
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      UpComing in{" "}
                      <span className="text-blue-600 font-bold">
                        {upcomingDays}
                      </span>{" "}
                      Days
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="1"
                      value={upcomingDays}
                      onChange={handleUpcomingDaysChange}
                      className="w-full accent-blue-500 cursor-grab focus:cursor-grabbing"
                    />
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
                      className="w-full accent-blue-500 cursor-grab focus:cursor-grabbing"
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
                      selectedRows.length === processedSubscribers.length &&
                      processedSubscribers.length > 0
                    }
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("subscriber_id")}
                >
                  <div className="flex items-center gap-1">
                    ID
                    {getSortIcon("subscriber_id")}
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
                  Plan
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("ispInfo.numberOfMonths")}
                >
                  <div className="flex items-center gap-1">
                    Months
                    {getSortIcon("ispInfo.numberOfMonths")}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("ispInfo.currentActivationDate")}
                >
                  <div className="flex items-center gap-1">
                    Activation Date
                    {getSortIcon("ispInfo.currentActivationDate")}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("ispInfo.renewalDate")}
                >
                  <div className="flex items-center gap-1">
                    Renewal Date
                    {getSortIcon("ispInfo.renewalDate")}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("ispInfo.mrc")}
                >
                  <div className="flex items-center gap-1">
                    MRC
                    {getSortIcon("ispInfo.mrc")}
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
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-6 text-gray-500">
                    <NoData
                      title="No Renewals Found"
                      description="Try adjusting your search or filters"
                    />
                  </td>
                </tr>
              ) : (
                currentItems.map((subscriber) => (
                  <React.Fragment key={subscriber?._id}>
                    <tr
                      className={
                        selectedRows
                          ?.map((row) => row.id)
                          .includes(subscriber._id)
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
                            .includes(subscriber._id)}
                          onChange={(e) =>
                            handleSelectRow(
                              e,
                              subscriber._id,
                              subscriber.status,
                              subscriber
                            )
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>

                      {/* ID */}
                      <td
                        className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 hover:text-blue-600 hover:cursor-pointer hover:underline"
                        onClick={() => handleRowClick(subscriber?._id)}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900 hover:text-blue-600">
                            {subscriber?.subscriber_id}
                          </span>
                        </div>
                      </td>

                      {/* Site Info */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900">
                            {subscriber?.siteCode} • {subscriber?.siteName}
                          </span>
                          <span className="text-xs text-gray-500 max-w-[180px]">
                            {subscriber?.siteAddress}
                          </span>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm truncate text-gray-900">
                            {subscriber?.ispInfo?.name}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            [ {subscriber?.ispInfo?.broadbandPlan} ]
                          </span>
                        </div>
                      </td>

                      {/* Months */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {subscriber?.ispInfo?.numberOfMonths}
                        </span>
                      </td>

                      {/* Activation Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {
                            subscriber?.ispInfo?.currentActivationDate?.split(
                              "T"
                            )[0]
                          }
                        </span>
                      </td>

                      {/* Renewal Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {subscriber?.ispInfo?.renewalDate?.split("T")[0]}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            ₹ {subscriber?.ispInfo?.mrc}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 inline-flex text-xs leading-4 font-medium rounded-full
                ${
                  subscriber?.status === "Active"
                    ? "bg-green-100 text-green-800" // Green for active
                    : subscriber?.status === "InActive"
                    ? "bg-red-100 text-red-800" // Red for inactive
                    : subscriber?.status === "Added"
                    ? "bg-blue-100 text-blue-800" // Blue for in-process
                    : subscriber?.status === "Rejected"
                    ? "bg-rose-100 text-rose-800" // Rose/deep pink for rejected
                    : subscriber?.status === "Deleted"
                    ? "bg-gray-200 text-gray-800" // Gray for deleted
                    : subscriber?.status === "Modified"
                    ? "bg-amber-100 text-amber-800" // Amber/orange for modified
                    : subscriber?.status === "Suspended"
                    ? "bg-purple-200 text-purple-800" // Purple for suspended
                    : "bg-gray-100 text-gray-800" // Default fallback
                }`}
                        >
                          {subscriber.status}
                        </span>
                      </td>
                    </tr>
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
                title="No Subscribers Found"
                description="Try adjusting your search or filters"
              />
            </div>
          ) : (
            currentItems.map((subscriber) => (
              <div
                key={subscriber?._id}
                className={`bg-white rounded-xl shadow-md overflow-hidden border-l-4 ${
                  subscriber?.status === "Active"
                    ? "bg-green-100 text-green-500" // Green for active
                    : subscriber?.status === "InActive"
                    ? "bg-red-100 text-red-500" // Red for inactive
                    : subscriber?.status === "Added"
                    ? "bg-blue-100 text-blue-800" // Blue for in-process
                    : subscriber?.status === "Rejected"
                    ? "bg-rose-100 text-rose-800" // Rose/deep pink for rejected
                    : subscriber?.status === "Deleted"
                    ? "bg-gray-200 text-gray-800" // Gray for deleted
                    : subscriber?.status === "Modified"
                    ? "bg-amber-100 text-amber-800" // Amber/orange for modified
                    : subscriber?.status === "Suspended"
                    ? "bg-purple-200 text-purple-800" // Purple for suspended
                    : "bg-gray-100 text-gray-800" // Default fallback
                }`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedRows
                        ?.map((row) => row.id)
                        .includes(subscriber._id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectRow(
                          e,
                          subscriber._id,
                          subscriber.status,
                          subscriber
                        );
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {subscriber.subscriber_id}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {subscriber?.siteCode} • {subscriber?.siteName}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-medium rounded-full
              ${
                subscriber?.status === "Active"
                  ? "bg-green-100 text-green-800" // Green for active
                  : subscriber?.status === "InActive"
                  ? "bg-red-100 text-red-800" // Red for inactive
                  : subscriber?.status === "Added"
                  ? "bg-blue-100 text-blue-800" // Blue for in-process
                  : subscriber?.status === "Rejected"
                  ? "bg-rose-100 text-rose-800" // Rose/deep pink for rejected
                  : subscriber?.status === "Deleted"
                  ? "bg-gray-200 text-gray-800" // Gray for deleted
                  : subscriber?.status === "Modified"
                  ? "bg-amber-100 text-amber-800" // Amber/orange for modified
                  : subscriber?.status === "Suspended"
                  ? "bg-purple-200 text-purple-800" // Purple for suspended
                  : "bg-gray-100 text-gray-800" // Default fallback
              }`}
                  >
                    {subscriber.status}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      Site Address
                    </p>
                    <p className="text-sm text-gray-900">
                      {subscriber?.siteAddress}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500">Plan</p>
                      <p className="text-sm text-gray-900">
                        {subscriber?.ispInfo?.broadbandPlan}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Months
                      </p>
                      <p className="text-sm text-gray-900">
                        {subscriber?.ispInfo?.numberOfMonths}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Amount
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        ₹ {subscriber?.ispInfo?.mrc}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Activation Date
                      </p>
                      <p className="text-sm text-gray-900">
                        {
                          subscriber?.ispInfo?.currentActivationDate?.split(
                            "T"
                          )[0]
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Renewal Date
                      </p>
                      <p className="text-sm text-gray-900">
                        {subscriber?.ispInfo?.renewalDate?.split("T")[0]}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
                  <button
                    onClick={() => handleRowClick(subscriber?._id)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {processedSubscribers.length > 0 && (
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
                      {Math.min(indexOfLastItem, processedSubscribers.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">
                      {processedSubscribers.length}
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
                    {Math.min(indexOfLastItem, processedSubscribers.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">
                    {processedSubscribers.length}
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
      </div>
    </div>
  );
};

export default SubscriptionTracker;
