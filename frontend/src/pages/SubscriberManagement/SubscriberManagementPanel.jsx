import React, { useCallback, useEffect } from "react";
import { useState } from "react";
import AddSubscriberForm from "./AddSubscriberForm";
import { Loader } from "lucide-react";
import * as XLSX from "xlsx";
import {
  approveSubscriberAPI,
  bulkApproveSubscriberAPI,
  bulkDeleteSubscriberAPI,
  bulkRejectSubscriberAPI,
  getSubscribersAPI,
  rejectSubscriberAPI,
} from "../../services/subscriberServices";
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
  FiDownload,
  FiUpload,
} from "react-icons/fi";
import AddSubscribersExcel from "./AddSubscribersExcel";
import NoData from "../../components/NoData";
import Toast from "../../components/Toast";
import { hasPermission } from "../../utils/auth";
import { getUserRoles } from "../../utils/jwt";
import { useLocation, useNavigate } from "react-router-dom";
import UserHoverCard from "../../components/UserHoverCard";

const SubscriberManagementPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isNewSubscriberFormOpen, setIsNewSubscriberFormOpen] = useState(false);
  const [isSubscribersExcelOpen, setIsSubscribersExcelOpen] = useState(false);

  const userRoles = getUserRoles();
  const DecisionMaker = hasPermission(
    ["Admin", "General Manager", "Manager", "Senior HR"],
    userRoles
  );

  const hasDeletePermission = hasPermission(
    ["Admin", "General Manager"],
    userRoles
  );

  const [loadingApprove, setLoadingApprove] = useState(null);
  const [loadingReject, setLoadingReject] = useState(null);
  const [loadingBulkDelete, setloadingBulkDelete] = useState(null);
  const [isManualRefetching, setIsManualRefetching] = useState(false);

  const fieldDisplayNames = {
    // Site Information
    siteName: "Site Name",
    siteCode: "Site Code",
    siteAddress: "Site Address",

    // Local Contact
    "localContact.name": "Local Contact Name",
    "localContact.contact": "Local Contact Number",

    // ISP Information
    "ispInfo.name": "ISP Provider",
    "ispInfo.contact": "ISP Contact",
    "ispInfo.broadbandPlan": "Broadband Plan",
    "ispInfo.numberOfMonths": "Number of Months",
    "ispInfo.otc": "OTC",
    "ispInfo.mrc": "MRC",

    // Credentials
    "credentials.username": "Username",
    "credentials.password": "Password",
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

  function deepEqual(obj1, obj2) {
    // Primitive comparison
    if (obj1 === obj2) return true;

    // Type check
    if (
      typeof obj1 !== "object" ||
      obj1 === null ||
      typeof obj2 !== "object" ||
      obj2 === null
    ) {
      return false;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    // Different number of keys
    if (keys1.length !== keys2.length) return false;

    // Check all keys recursively
    for (const key of keys1) {
      if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
        return false;
      }
    }

    return true;
  }

  const [hoveredUser, setHoveredUser] = useState({
    modifiedBy: null,
    employeeId: null,
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

  // Filter and sort employees
  const processedSubscribers = React.useMemo(() => {
    if (!subscribers?.data) return [];

    let result = [...subscribers.data];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (sub) =>
          sub.subscriber_id.toLowerCase().includes(term) ||
          sub.siteCode.toLowerCase().includes(term) ||
          sub.siteName.toLowerCase().includes(term) ||
          sub.siteAddress.toLowerCase().includes(term) ||
          sub.ispInfo?.broadbandPlan.toLowerCase().includes(term)
      );
    }

    // Apply filters
    if (filters.status) {
      result = result.filter((sub) => sub.status === filters.status);
    }

    // Apply date range filter
    if (filters.startDate || filters.endDate) {
      result = result.filter((sub) => {
        const subDate = new Date(sub.activationDate.split("T")[0]);
        const startDate = filters.startDate
          ? new Date(filters.startDate)
          : null;
        const endDate = filters.endDate ? new Date(filters.endDate) : null;

        // Set time to midnight for proper comparison
        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);

        const afterStart = !startDate || subDate >= startDate;
        const beforeEnd = !endDate || subDate <= endDate;

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

        if (
          a.request_status === "rejected" &&
          b.request_status !== "rejected"
        ) {
          return -1;
        }
        if (
          a.request_status !== "rejected" &&
          b.request_status === "rejected"
        ) {
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
  }, [subscribers, searchTerm, filters, sortConfig, currentPage]);

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
    setFilters({ status: "", startDate: "", endDate: "" });
    setSearchTerm("");
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? <FiChevronUp /> : <FiChevronDown />;
  };

  const handleOpenNewSubscriberForm = () => {
    setIsNewSubscriberFormOpen(true);
  };

  const handleCloseNewSubscriberForm = () => {
    refetch();
    setIsNewSubscriberFormOpen(false);
  };

  const handleOpenSubscribersExcel = () => {
    setIsSubscribersExcelOpen(true);
  };

  const handleCloseSubscribersExcel = () => {
    refetch();
    setIsSubscribersExcelOpen(false);
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

  useEffect(() => {
    const allPending =
      selectedRows.length > 0 &&
      selectedRows.every(
        (row) =>
          row.subscriber?.request_status === "pending" &&
          row.status !== "Modified"
      );
    setAllSelectedPending(allPending);
  }, [selectedRows]);

  const handleApprove = async (subscriberId, status, subscriber) => {
    setLoadingApprove(subscriberId);
    try {
      const response = await approveSubscriberAPI(
        subscriberId,
        status,
        subscriber
      );

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

  const handleReject = async (subscriberId, status, subscriber) => {
    setLoadingReject(subscriberId);
    try {
      const response = await rejectSubscriberAPI(
        subscriberId,
        status,
        subscriber
      );

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

  const handleBulkApprove = async () => {
    if (!selectedRows.length) return;

    setLoadingApprove("bulk");
    setSubmissionStatus({
      type: "info",
      message: `Processing ${selectedRows.length} subscribers...`,
    });

    try {
      // Prepare updates with only necessary fields
      const updates = selectedRows.map(({ id, status, subscriber }) => {
        if (status === "Added") {
          return {
            id,
            status: "Active",
            request_status: "approved",
          };
        } else if (status === "InActive") {
          return {
            id,
            status: "InActive",
            request_status: "approved",
          };
        }
      });

      // Process in batches
      const batchSize = 10;
      const results = [];
      let successful = 0;
      let failed = 0;

      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);

        // Update progress
        setSubmissionStatus((prev) => ({
          ...prev,
          progress: Math.floor((i / updates.length) * 100),
          message: `Processing ${i + 1}-${Math.min(
            i + batchSize,
            updates.length
          )} of ${updates.length}...`,
        }));

        try {
          const response = await bulkApproveSubscriberAPI(batch);

          // Track successful updates
          successful += batch.length;
          results.push(
            ...batch.map((update) => ({
              id: update.id,
              status: "success",
              data: update,
            }))
          );
        } catch (error) {
          // Track failed updates
          failed += batch.length;
          results.push(
            ...batch.map((update) => ({
              id: update.id,
              status: "error",
              error: error.message || "Batch update failed",
              data: update,
            }))
          );
        }
      }

      // Prepare final report
      const errorDetails = results
        .filter((r) => r.status === "error")
        .map((r) => `ID ${r.id}: ${r.error}`);

      setSubmissionStatus({
        type: failed > 0 ? (successful > 0 ? "warning" : "error") : "success",
        message: `Processed ${updates.length} subscribers: ${successful} succeeded, ${failed} failed`,
        details: errorDetails,
      });

      // Refresh data if successful
      if (failed === 0) {
        refetch(); // Your data refresh function
        setSelectedRows([]);
      }
    } catch (error) {
      console.error("Batch patch error:", error);
      setSubmissionStatus({
        type: "error",
        message: error?.response?.data?.message || "Batch status update failed",
        details: [error.message],
      });
    } finally {
      setLoadingApprove(null);
    }
  };

  const handleBulkReject = async () => {
    if (!selectedRows.length) return;

    setLoadingReject("bulk");
    setSubmissionStatus({
      type: "info",
      message: `Processing ${selectedRows.length} subscribers...`,
    });

    try {
      // Prepare updates with only necessary fields
      const updates = selectedRows.map(({ id, status, subscriber }) => {
        if (status === "Added") {
          return {
            id,
            status: "Rejected",
            request_status: "rejected",
          };
        } else if (status === "InActive") {
          return {
            id,
            status: "InActive",
            request_status: "approved",
          };
        }
      });

      // Process in batches
      const batchSize = 10;
      const results = [];
      let successful = 0;
      let failed = 0;

      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);

        // Update progress
        setSubmissionStatus((prev) => ({
          ...prev,
          progress: Math.floor((i / updates.length) * 100),
          message: `Processing ${i + 1}-${Math.min(
            i + batchSize,
            updates.length
          )} of ${updates.length}...`,
        }));

        try {
          const response = await bulkRejectSubscriberAPI(batch);

          // Track successful updates
          successful += batch.length;
          results.push(
            ...batch.map((update) => ({
              id: update.id,
              status: "success",
              data: update,
            }))
          );
        } catch (error) {
          // Track failed updates
          failed += batch.length;
          results.push(
            ...batch.map((update) => ({
              id: update.id,
              status: "error",
              error: error.message || "Batch update failed",
              data: update,
            }))
          );
        }
      }

      // Prepare final report
      const errorDetails = results
        .filter((r) => r.status === "error")
        .map((r) => `ID ${r.id}: ${r.error}`);

      setSubmissionStatus({
        type: failed > 0 ? (successful > 0 ? "warning" : "error") : "success",
        message: `Processed ${updates.length} subscribers: ${successful} succeeded, ${failed} failed`,
        details: errorDetails,
      });

      // Refresh data if successful
      if (failed === 0) {
        refetch(); // Your data refresh function
        setSelectedRows([]);
      }
    } catch (error) {
      console.error("Batch patch error:", error);
      setSubmissionStatus({
        type: "error",
        message: error?.response?.data?.message || "Batch status update failed",
        details: [error.message],
      });
    } finally {
      setLoadingReject(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedRows.length) return;

    setloadingBulkDelete("bulk");
    setSubmissionStatus({
      type: "info",
      message: `Processing ${selectedRows.length} subscribers...`,
    });

    try {
      // Prepare updates with only necessary fields
      const updates = selectedRows.map(({ id }) => {
        return id;
      });

      // Process in batches
      const batchSize = 10;
      const results = [];
      let successful = 0;
      let failed = 0;

      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);

        // Update progress
        setSubmissionStatus((prev) => ({
          ...prev,
          progress: Math.floor((i / updates.length) * 100),
          message: `Processing ${i + 1}-${Math.min(
            i + batchSize,
            updates.length
          )} of ${updates.length}...`,
        }));

        try {
          const response = await bulkDeleteSubscriberAPI(batch);

          // Track successful updates
          successful += batch.length;
          results.push(
            ...batch.map((update) => ({
              id: update.id,
              status: "success",
              data: update,
            }))
          );
        } catch (error) {
          // Track failed updates
          failed += batch.length;
          results.push(
            ...batch.map((update) => ({
              id: update.id,
              status: "error",
              error: error.message || "Batch update failed",
              data: update,
            }))
          );
        }
      }

      // Prepare final report
      const errorDetails = results
        .filter((r) => r.status === "error")
        .map((r) => `ID ${r.id}: ${r.error}`);

      setSubmissionStatus({
        type: failed > 0 ? (successful > 0 ? "warning" : "error") : "success",
        message: `Processed ${updates.length} subscribers: ${successful} succeeded, ${failed} failed`,
        details: errorDetails,
      });

      // Refresh data if successful
      if (failed === 0) {
        refetch(); // Your data refresh function
        setSelectedRows([]);
      }
    } catch (error) {
      console.error("Batch patch error:", error);
      setSubmissionStatus({
        type: "error",
        message: error?.response?.data?.message || "Batch status update failed",
        details: [error.message],
      });
    } finally {
      setloadingBulkDelete(null);
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

      // Determine which data to export
      setProgress(30);
      const dataToExport =
        selectedRows.length > 0
          ? selectedRows.map((row) => row.subscriber)
          : processedSubscribers;

      if (!dataToExport || dataToExport.length === 0) {
        alert("No data available to export");
        return;
      }

      // Prepare the worksheet data
      setProgress(50);

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
        "Activation Date": subscriber.activationDate?.split("T")[0] || "",
        "Current Activation Date":
          subscriber.ispInfo?.currentActivationDate?.split("T")[0] || "",
        "Renewal Date": subscriber.ispInfo?.renewalDate?.split("T")[0] || "",
      }));

      // Create workbook and worksheet
      setProgress(70);
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Subscribers");

      // Generate Excel file and trigger download
      setProgress(90);

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
    <div className=" min-h-fit">
      {isNewSubscriberFormOpen && (
        <AddSubscriberForm handleClose={handleCloseNewSubscriberForm} />
      )}

      {isSubscribersExcelOpen && (
        <AddSubscribersExcel handleClose={handleCloseSubscribersExcel} />
      )}

      <div className="sticky top-0 z-10 bg-white shadow-sm">
        {submissionStatus && (
          <Toast
            type={submissionStatus.type}
            message={submissionStatus.message}
            onClose={() => setSubmissionStatus(null)}
          />
        )}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 whitespace-nowrap">
            Subscriber Directory
          </h2>

          <div className="flex items-center gap-3 w-full sm:w-auto">
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
                      <option value="Added">Added</option>
                      <option value="Active">Active</option>
                      <option value="InActive">InActive</option>
                      <option value="Modified">Modified</option>
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
                      Subscribers Per Page:{" "}
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

            <button
              onClick={handleOpenNewSubscriberForm}
              className="whitespace-nowrap px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Add Subscriber
            </button>
          </div>
        </div>

        <div className="w-full flex flex-col px-4 py-2 sm:flex-row justify-between gap-3 sm:gap-0 relative">
          {/* Left Button Group */}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              className="flex items-center gap-2 sm:flex-none whitespace-nowrap px-3 py-2 sm:px-4 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-sm sm:text-base"
              onClick={handleOpenSubscribersExcel}
            >
              <FiDownload />
              Import Subscribers
            </button>
            <button
              onClick={exportToExcel}
              disabled={isExporting}
              className={`flex items-center gap-2 sm:flex-none whitespace-nowrap px-3 py-2 sm:px-4 sm:py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 text-sm sm:text-base ${
                isExporting ? "cursor-not-allowed" : "cursor-pointer"
              }`}
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
            {hasDeletePermission && selectedRows.length > 0 && (
              <button
                className="flex-1 sm:flex-none whitespace-nowrap px-3 py-2 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-sm sm:text-base"
                onClick={handleBulkDelete}
                disabled={loadingBulkDelete === "bulk"}
              >
                {selectedRows.length > 0
                  ? `Delete (${selectedRows.length})`
                  : "Delete"}
              </button>
            )}
          </div>

          {/* Right Button Group */}
          {allSelectedPending && selectedRows.length > 0 && (
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                className="flex-1 sm:flex-none whitespace-nowrap px-3 py-2 sm:px-4 sm:py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-sm sm:text-base"
                onClick={handleBulkApprove}
                disabled={loadingApprove === "bulk"}
              >
                {loadingApprove === "bulk" ? (
                  <Loader className="h-5 w-5 animate-spin" />
                ) : (
                  `Approve (${selectedRows.length})`
                )}
              </button>
              <button
                className="flex-1 sm:flex-none whitespace-nowrap px-3 py-2 sm:px-4 sm:py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 text-sm sm:text-base"
                onClick={handleBulkReject}
                disabled={loadingReject === "bulk"}
              >
                {loadingReject === "bulk" ? (
                  <Loader className="h-5 w-5 animate-spin" />
                ) : (
                  `Reject (${selectedRows.length})`
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Operation Features - Responsive */}

        {/* Subscriber List Table */}
        <div className="hidden sm:block bg-white shadow-xl rounded-xl overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-500">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
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
                  Sub ID {getSortIcon("subscriber_id")}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("siteName")}
                >
                  Site Name {getSortIcon("siteName")}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("siteCode")}
                >
                  Site Code {getSortIcon("siteCode")}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("siteAddress")}
                >
                  Address {getSortIcon("siteAddress")}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("ispInfo.broadbandPlan")}
                >
                  Plan {getSortIcon("ispInfo.broadbandPlan")}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("ispInfo.numberOfMonths")}
                >
                  Months {getSortIcon("ispInfo.numberOfMonths")}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("ispInfo.mrc")}
                >
                  MRC {getSortIcon("ispInfo.mrc")}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("activationDate")}
                >
                  Activated {getSortIcon("activationDate")}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("status")}
                >
                  Status {getSortIcon("status")}
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
                  <td colSpan="11" className="text-center py-6 text-gray-500">
                    <NoData
                      title="No Subscribers Found"
                      description="Try adjusting your search or filters"
                    />
                  </td>
                </tr>
              ) : (
                currentItems.map((subscriber) => (
                  <React.Fragment key={subscriber?._id}>
                    <tr
                      key={subscriber.subscriber_id}
                      className={
                        selectedRows
                          ?.map((row) => row.id)
                          .includes(subscriber._id)
                          ? "bg-blue-100"
                          : ""
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 hover:text-blue-600 hover:cursor-pointer hover:underline"
                        onClick={() => handleRowClick(subscriber._id)}
                      >
                        {subscriber.subscriber_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {subscriber.siteName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {subscriber.siteCode}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {subscriber.siteAddress}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {subscriber.ispInfo.broadbandPlan}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {subscriber.ispInfo.numberOfMonths}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{subscriber.ispInfo.mrc}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {/* {new Date(subscriber.activationDate).toLocaleDateString()} */}
                        {subscriber.activationDate?.split("T")[0]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {DecisionMaker &&
                          subscriber.request_status === "pending" && (
                            <>
                              <button
                                className="p-1.5 text-green-600 hover:bg-green-500 hover:text-white rounded-md transition-colors"
                                title="Approve"
                                onClick={() =>
                                  handleApprove(
                                    subscriber._id,
                                    subscriber.status,
                                    subscriber
                                  )
                                }
                                disabled={loadingApprove === subscriber._id}
                              >
                                {loadingApprove === subscriber._id ? (
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
                                    subscriber._id,
                                    subscriber.status,
                                    subscriber
                                  )
                                }
                                disabled={loadingReject === subscriber._id}
                              >
                                {loadingReject === subscriber._id ? (
                                  <Loader className="h-5 w-5 animate-spin" />
                                ) : (
                                  <FiX className="h-5 w-5" />
                                )}
                              </button>
                            </>
                          )}
                      </td>
                    </tr>
                    {/* Add this row for Modified status remarks */}
                    {(subscriber.status === "Modified" ||
                      subscriber.remark) && (
                      <tr>
                        <td colSpan="11" className="px-4 py-3 bg-yellow-50">
                          <div className="space-y-3">
                            {/* Remarks Section */}
                            {subscriber.remark && (
                              <div className="flex items-start">
                                <span className="text-yellow-600 mr-2">📝</span>
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Remarks:</span>{" "}
                                  {subscriber.remark}
                                </div>
                              </div>
                            )}

                            {/* Modified Data Section */}
                            {subscriber?.status === "Modified" &&
                              subscriber?.modifiedData &&
                              !deepEqual(
                                subscriber.modifiedData.previous,
                                subscriber.modifiedData.current
                              ) && (
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
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                                      <div className="flex items-center gap-3 mb-4">
                                        <div className="w-3 h-3 rounded-full bg-gray-400 shadow-inner"></div>
                                        <h3 className="font-semibold text-gray-700 flex items-center">
                                          Previous Values
                                        </h3>
                                      </div>
                                      <div className="space-y-3.5">
                                        {Object.entries(
                                          subscriber.modifiedData.previous
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
                                                className="group"
                                              >
                                                <div className="font-medium text-gray-600 flex flex-col sm:flex-row gap-1 sm:gap-3">
                                                  <span className="inline-block min-w-[120px] capitalize text-gray-500 group-hover:text-gray-700 transition-colors">
                                                    {getDisplayName(key)}:
                                                  </span>
                                                  <div className="flex-1">
                                                    <div className="space-y-2 pl-2 border-l-2 border-gray-400">
                                                      {Object.entries(
                                                        value
                                                      ).map(
                                                        ([
                                                          nestedKey,
                                                          nestedValue,
                                                        ]) => (
                                                          <div
                                                            key={`prev-nested-${nestedKey}`}
                                                            className="flex flex-col sm:flex-row gap-1 sm:gap-3"
                                                          >
                                                            <span className="inline-block min-w-[100px] capitalize text-gray-400 text-sm">
                                                              {getDisplayName(
                                                                nestedKey
                                                              )}
                                                              :
                                                            </span>
                                                            <span className="text-gray-700 break-words">
                                                              {nestedValue || (
                                                                <span className="text-gray-400">
                                                                  (empty)
                                                                </span>
                                                              )}
                                                            </span>
                                                          </div>
                                                        )
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }

                                          // Handle regular values
                                          return (
                                            <div
                                              key={`prev-${key}`}
                                              className="group"
                                            >
                                              <div className="font-medium text-gray-600 flex flex-col sm:flex-row gap-1 sm:gap-3">
                                                <span className="inline-block min-w-[120px] capitalize text-gray-500 group-hover:text-gray-700 transition-colors">
                                                  {getDisplayName(key)}:
                                                </span>
                                                <div className="flex-1">
                                                  {Array.isArray(value) ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                      {value.map((item, i) => (
                                                        <span
                                                          key={i}
                                                          className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full border border-gray-200"
                                                        >
                                                          {item}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  ) : (
                                                    <span className="text-gray-800 break-words">
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
                                    <div className="bg-blue-100 p-4 rounded-lg border border-blue-200 shadow-sm">
                                      <div className="flex items-center gap-3 mb-4">
                                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-inner"></div>
                                        <h3 className="font-semibold text-blue-700 flex items-center">
                                          New Values
                                        </h3>
                                      </div>
                                      <div className="space-y-3.5">
                                        {Object.entries(
                                          subscriber.modifiedData.current
                                        ).map(([key, value]) => {
                                          const previousValue =
                                            subscriber.modifiedData.previous[
                                              key
                                            ];

                                          // Handle nested objects
                                          if (
                                            typeof value === "object" &&
                                            value !== null &&
                                            !Array.isArray(value)
                                          ) {
                                            return (
                                              <div
                                                key={`curr-${key}`}
                                                className="group"
                                              >
                                                <div className="font-medium text-blue-600 flex flex-col sm:flex-row gap-1 sm:gap-3">
                                                  <span className="inline-block min-w-[120px] capitalize text-blue-500 group-hover:text-blue-700 transition-colors">
                                                    {getDisplayName(key)}:
                                                  </span>
                                                  <div className="flex-1">
                                                    <div className="space-y-2 pl-2 border-l-2 border-blue-400">
                                                      {Object.entries(
                                                        value
                                                      ).map(
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
                                                              key={`curr-nested-${nestedKey}`}
                                                              className="flex flex-col sm:flex-row gap-1 sm:gap-3"
                                                            >
                                                              <span className="inline-block min-w-[100px] capitalize text-blue-400 text-sm">
                                                                {getDisplayName(
                                                                  nestedKey
                                                                )}
                                                                :
                                                              </span>
                                                              <span
                                                                className={`break-words ${
                                                                  nestedHasChanged
                                                                    ? "bg-green-600 px-2 py-1 rounded-md text-white font-semibold"
                                                                    : "text-blue-700"
                                                                }`}
                                                              >
                                                                {nestedValue || (
                                                                  <span
                                                                    className={
                                                                      nestedHasChanged
                                                                        ? "bg-green-600 text-white px-2 py-1 rounded-md"
                                                                        : "text-blue-400"
                                                                    }
                                                                  >
                                                                    (empty)
                                                                  </span>
                                                                )}
                                                              </span>
                                                            </div>
                                                          );
                                                        }
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }

                                          // Handle regular values
                                          const hasChanged =
                                            JSON.stringify(value) !==
                                            JSON.stringify(previousValue);

                                          return (
                                            <div
                                              key={`curr-${key}`}
                                              className="group"
                                            >
                                              <div className="font-medium text-blue-600 flex flex-col sm:flex-row gap-1 sm:gap-3">
                                                <span className="inline-block min-w-[120px] capitalize text-blue-500 group-hover:text-blue-700 transition-colors">
                                                  {getDisplayName(key)}:
                                                </span>
                                                <div className="flex-1">
                                                  {Array.isArray(value) ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                      {value.map((item, i) => {
                                                        const prevItem =
                                                          Array.isArray(
                                                            previousValue
                                                          )
                                                            ? previousValue[i]
                                                            : null;
                                                        const itemHasChanged =
                                                          item !== prevItem;

                                                        return (
                                                          <span
                                                            key={i}
                                                            className={`text-xs px-2.5 py-1 rounded-full border ${
                                                              itemHasChanged
                                                                ? "bg-green-100 text-green-800 border-green-200"
                                                                : "bg-blue-50 text-blue-700 border-blue-100"
                                                            }`}
                                                          >
                                                            {item}
                                                          </span>
                                                        );
                                                      })}
                                                    </div>
                                                  ) : (
                                                    <span
                                                      className={`text-blue-900 break-words ${
                                                        hasChanged
                                                          ? "bg-green-600 px-2 py-1 rounded-xl text-white font-semibold"
                                                          : "text-blue-900"
                                                      }`}
                                                    >
                                                      {value || (
                                                        <span
                                                          className={
                                                            hasChanged
                                                              ? "bg-green-600 text-white px-2 py-1 rounded-xl"
                                                              : "text-blue-400"
                                                          }
                                                        >
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
                                            subscriber.modifiedData.modified_by,
                                          employeeId: subscriber._id,
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
                                        {subscriber?.modifiedData?.modified_by
                                          ?.name || "Unknown"}
                                      </span>
                                    </span>
                                    <span className="mx-2">•</span>
                                    <span>
                                      {new Date(
                                        subscriber.modifiedData.modified_at
                                      ).toLocaleString()}
                                    </span>

                                    {/* Hover Card */}
                                    {hoveredUser?.modifiedBy?._id ===
                                      subscriber?.modifiedData?.modified_by
                                        ?._id &&
                                      hoveredUser?.employeeId ===
                                        subscriber?._id && (
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
        <div className="sm:hidden space-y-3">
          {currentItems.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <NoData
                title="No Subscribers Found"
                description="Try adjusting your search or filters"
              />
            </div>
          ) : (
            currentItems.map((subscriber) => (
              <div
                key={subscriber.subscriber_id}
                className={`bg-white p-4 rounded-lg border-2 ${
                  selectedRows?.map((row) => row.id).includes(subscriber._id)
                    ? "border-blue-500"
                    : "border-gray-200"
                }`}
              >
                {/* Header Row */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
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
                      className="h-4 w-4 text-blue-600 mr-2"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="font-medium">
                      ID:{" "}
                      <span
                        className="text-blue-600 underline"
                        onClick={() => handleRowClick(subscriber._id)}
                      >
                        {subscriber.subscriber_id}
                      </span>
                    </span>
                  </div>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
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

                {/* Main Content */}
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">Site</p>
                    <p className="font-medium">
                      {subscriber.siteName} ({subscriber.siteCode})
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-gray-700">{subscriber.siteAddress}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div>
                      <p className="text-sm text-gray-500">Plan</p>
                      <p className="font-medium">
                        {subscriber.ispInfo.broadbandPlan}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Months</p>
                      <p className="font-medium">
                        {subscriber.ispInfo.numberOfMonths}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">MRC</p>
                      <p className="font-medium">₹{subscriber.ispInfo.mrc}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Activated</p>
                    <p className="text-gray-700">
                      {subscriber.activationDate?.split("T")[0]}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-100">
                  {DecisionMaker && subscriber.request_status === "pending" && (
                    <>
                      <button
                        className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center justify-center"
                        onClick={() =>
                          handleApprove(
                            subscriber._id,
                            subscriber.status,
                            subscriber
                          )
                        }
                        disabled={loadingApprove === subscriber._id}
                      >
                        {loadingApprove === subscriber._id ? (
                          <Loader className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <FiCheck className="h-4 w-4 mr-1" />
                        )}
                        Approve
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center justify-center"
                        onClick={() =>
                          handleReject(
                            subscriber._id,
                            subscriber.status,
                            subscriber
                          )
                        }
                        disabled={loadingReject === subscriber._id}
                      >
                        {loadingReject === subscriber._id ? (
                          <Loader className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <FiX className="h-4 w-4 mr-1" />
                        )}
                        Reject
                      </button>
                    </>
                  )}
                </div>
                {subscriber.status === "Modified" && (
                  <div>
                    <div className="w-full px-4 py-3 bg-yellow-50 rounded-lg mb-3">
                      <div className="space-y-3">
                        {/* Remarks Section */}
                        {subscriber.remark && (
                          <div className="flex items-start">
                            <span className="text-yellow-600 mr-2">📝</span>
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">Remarks:</span>{" "}
                              {subscriber.remark}
                            </div>
                          </div>
                        )}

                        {/* Modified Data Section */}
                        {subscriber.modifiedData && (
                          <div className="border-t border-yellow-200 pt-3">
                            <div className="flex items-start mb-2">
                              <span className="text-yellow-600 mr-2">🔄</span>
                              <span className="text-sm font-medium text-gray-700">
                                Changes:
                              </span>
                            </div>

                            {/* Responsive Grid - Stacks on mobile */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {/* Previous Data */}
                              <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-1 mb-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                  <h3 className="font-medium text-gray-700 text-xs">
                                    Previous
                                  </h3>
                                </div>
                                <div className="space-y-1">
                                  {Object.entries(
                                    subscriber.modifiedData.previous
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
                                          className="text-xs"
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
                                        className="text-xs"
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
                                  <h3 className="font-medium text-blue-700 text-xs">
                                    New
                                  </h3>
                                </div>
                                <div className="space-y-1">
                                  {Object.entries(
                                    subscriber.modifiedData.current
                                  ).map(([key, value]) => {
                                    const previousValue =
                                      subscriber.modifiedData.previous[key];
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
                                          className="text-xs"
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
                                        className="text-xs"
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

                            {/* Metadata - Mobile Optimized */}
                            <div className="mt-3 text-xs text-gray-500 relative">
                              <span
                                className="hover:underline cursor-pointer inline-block"
                                onMouseEnter={() =>
                                  setHoveredUser({
                                    modifiedBy:
                                      subscriber.modifiedData.modified_by,
                                    employeeId: subscriber._id,
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
                                  {subscriber?.modifiedData?.modified_by
                                    ?.name || "Unknown"}
                                </span>
                              </span>
                              <span className="mx-2">•</span>
                              <span>
                                {new Date(
                                  subscriber.modifiedData.modified_at
                                ).toLocaleString()}
                              </span>

                              {/* Mobile-Friendly Hover Card */}
                              {hoveredUser?.modifiedBy?._id ===
                                subscriber?.modifiedData?.modified_by?._id &&
                                hoveredUser?.employeeId === subscriber?._id && (
                                  <UserHoverCard userData={hoveredUser} />
                                )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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

export default SubscriberManagementPanel;
