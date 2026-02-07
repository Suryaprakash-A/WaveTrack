import React, { useState, useEffect, useCallback } from "react";
import NoData from "../../components/NoData";
import { Loader } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getEmployeesAPI,
  approveEmployeeAPI,
  rejectEmployeeAPI,
  deleteEmployeeAPI,
} from "../../services/employeeServices";
import {
  FiFilter,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp,
  FiEdit,
  FiCheck,
  FiX,
} from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";

import { getUserRoles } from "../../utils/jwt";
import { hasPermission } from "../../utils/auth";
import Toast from "../../components/Toast";
import AddEmployeeForm from "./AddEmployeeForm";
import UpdateEmployeeForm from "./UpdateEmployeeForm";
import UserHoverCard from "../../components/UserHoverCard";

const EmployeeManagementPanel = () => {
  const userRoles = getUserRoles();
  const DecisionMaker = hasPermission(
    ["Admin", "General Manager", "Manager", "Senior HR"],
    userRoles
  );

  const hasDeletePermission = hasPermission(
    ["Admin", "General Manager"],
    userRoles
  );

  const [isNewEmployeeFormOpen, setIsNewEmployeeFormOpen] = useState(false);
  const [isUpdateEmployeeFormOpen, setIsUpdateEmployeeFormOpen] =
    useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [loadingApprove, setLoadingApprove] = useState(null);
  const [loadingReject, setLoadingReject] = useState(null);
  const [loadingDelete, setLoadingDelete] = useState(null);

  const [hoveredUser, setHoveredUser] = useState({
    modifiedBy: null,
    employeeId: null,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [filters, setFilters] = useState({
    status: "",
    role: "",
  });
  const [activeFilters, setActiveFilters] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const {
    data: employees,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryFn: getEmployeesAPI,
    queryKey: ["getEmployees"],
    refetchOnWindowFocus: true,
  });

  //Delete Employee Mutation
  const { mutateAsync: deleteEmployee } = useMutation({
    mutationFn: deleteEmployeeAPI,
    mutationKey: ["deleteEmployee"],
  });

  const handleOpenNewEmployeeForm = () => {
    setIsNewEmployeeFormOpen(true);
  };

  const handleCloseNewEmployeeForm = () => {
    refetch();
    setIsNewEmployeeFormOpen(false);
  };

  const handleEdit = async (id) => {
    setSelectedEmployeeId(id);
    setIsUpdateEmployeeFormOpen(true);
  };

  const handleCloseEdit = () => {
    refetch();
    setSelectedEmployeeId(null);
    setIsUpdateEmployeeFormOpen(false);
  };

  const handleApprove = async (employeeId, status, employee) => {
    setLoadingApprove(employeeId);
    try {
      const response = await approveEmployeeAPI(employeeId, status, employee);

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
          "Failed to Approve Employee",
      });
    } finally {
      setLoadingApprove(null);
    }
  };

  const handleReject = async (employeeId, status, employee) => {
    setLoadingReject(employeeId);
    try {
      // Call your API to reject the employee
      const response = await rejectEmployeeAPI(employeeId, status, employee);

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
      // console.error("Error rejecting employee:", error);
      setSubmissionStatus({
        type: "error",
        message:
          error?.response?.data?.error ??
          error?.message ??
          "Failed to Reject Employee",
      });
    } finally {
      setLoadingReject(null);
    }
  };

  const handleDelete = async (employeeId) => {
    setLoadingDelete(employeeId);
    try {
      // Call your API to delete the employee
      const response = await deleteEmployee(employeeId);

      // Refresh the employee list
      setTimeout(() => {
        refetch();
      }, 1000);

      // Show success message
      setSubmissionStatus({
        type: "success",
        message: response?.message ?? "Deleted Successfully",
      });
    } catch (error) {
      // console.error("Error deleting employee:", error);
      setSubmissionStatus({
        type: "error",
        message:
          error?.response?.data?.error ??
          error?.message ??
          "Failed to Delete Employee",
      });
    } finally {
      setLoadingDelete(null);
    }
  };

  // Filter and sort employees
  const processedEmployees = React.useMemo(() => {
    if (!employees?.data) return [];

    let result = [...employees.data];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (emp) =>
          emp?.name.toLowerCase().includes(term) ||
          emp?.email.toLowerCase().includes(term) ||
          emp?.contact.toLowerCase().includes(term) ||
          emp?.employee_id.toLowerCase().includes(term)
      );
    }

    // Apply filters
    if (filters.status) {
      result = result.filter((emp) => emp.status === filters.status);
    }
    if (filters.role) {
      result = result.filter((emp) => emp.roles.includes(filters.role));
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

        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
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
  }, [employees, searchTerm, filters, sortConfig]);

  // Get current items
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedEmployees.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(processedEmployees.length / itemsPerPage);

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
    if (filters.role) count++;
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
    setFilters({ status: "", role: "" });
    setSearchTerm("");
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? <FiChevronUp /> : <FiChevronDown />;
  };

  const [isManualRefetching, setIsManualRefetching] = useState(false);

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
      {/* min-h-screen */}
      {/* Sticky Search Header */}
      {submissionStatus && (
        <Toast
          type={submissionStatus.type}
          message={submissionStatus.message}
          onClose={() => setSubmissionStatus(null)}
        />
      )}

      {isNewEmployeeFormOpen && (
        <AddEmployeeForm handleClose={handleCloseNewEmployeeForm} />
      )}

      {isUpdateEmployeeFormOpen && (
        <UpdateEmployeeForm
          id={selectedEmployeeId}
          handleClose={handleCloseEdit}
        />
      )}

      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 whitespace-nowrap">
            Employee Directory
          </h2>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search with advanced filter dropdown */}
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search employees..."
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
                      <option value="Active">Active</option>
                      <option value="InActive">Inactive</option>
                      <option value="OnProcess">On Process</option>
                      <option value="Modified">Modified</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      className="w-full border rounded-md p-2 text-sm"
                      value={filters.role}
                      onChange={(e) =>
                        handleFilterChange("role", e.target.value)
                      }
                    >
                      <option value="">All Roles</option>
                      <option value="Admin">Admin</option>
                      <option value="General Manager">General Manager</option>
                      <option value="Manager">Manager</option>
                      <option value="Senior HR">Senior HR</option>
                      <option value="HR">HR</option>
                      <option value="Finance">Finance</option>
                      <option value="Team Lead">Team Lead</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>

                  <div className="flex justify-between">
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
              onClick={handleOpenNewEmployeeForm}
              className="whitespace-nowrap px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Add Employee
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Desktop Table */}
        <div className="hidden sm:block shadow-xl rounded-xl overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-500">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("employee_id")}
                >
                  <div className="flex items-center">
                    ID {getSortIcon("employee_id")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("name")}
                >
                  <div className="flex items-center">
                    Name {getSortIcon("name")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("email")}
                >
                  <div className="flex items-center">
                    Contact {getSortIcon("email")}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider">
                  Roles
                </th>
                <th
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("status")}
                >
                  <div className="flex items-center">
                    Status {getSortIcon("status")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("createdAt")}
                >
                  <div className="flex items-center">
                    Joined {getSortIcon("createdAt")}
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
                      title="No Employees Found"
                      description="Try adjusting your search or filters"
                    />
                  </td>
                </tr>
              ) : (
                currentItems.map((emp) => (
                  <React.Fragment key={emp?._id}>
                    <tr
                      key={emp?._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {emp?.employee_id}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-medium">
                              {emp?.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {emp?.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {emp?.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          {emp?.contact}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2 max-w-xs">
                          {emp?.roles.map((role, index) => (
                            <span
                              key={index}
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                [
                                  "Admin",
                                  "General Manager",
                                  "Manager",
                                ].includes(role)
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold leading-5 ${
                            emp.status === "Active"
                              ? "bg-green-100 text-green-800" // Green for active
                              : emp.status === "InActive"
                              ? "bg-red-100 text-red-800" // Red for inactive
                              : emp.status === "OnProcess"
                              ? "bg-blue-100 text-blue-800" // Blue for in-process
                              : emp.status === "Rejected"
                              ? "bg-rose-100 text-rose-800" // Rose/deep pink for rejected
                              : emp.status === "Deleted"
                              ? "bg-gray-200 text-gray-800" // Gray for deleted
                              : emp.status === "Modified"
                              ? "bg-amber-100 text-amber-800" // Amber/orange for modified
                              : "bg-gray-100 text-gray-800" // Default fallback
                          }`}
                        >
                          {emp?.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {/* {new Date(emp.createdAt).toLocaleDateString()} */}
                        {emp?.joining_date.split("T")[0]}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {emp?.status !== "OnProcess" &&
                            emp?.request_status !== "pending" && (
                              <button
                                className="p-1.5 text-blue-600 hover:bg-blue-500 hover:text-white rounded-md transition-colors"
                                title="Edit"
                                onClick={() => handleEdit(emp._id)}
                              >
                                <FiEdit className="h-5 w-5" />
                              </button>
                            )}

                          {DecisionMaker &&
                            emp?.request_status === "pending" && (
                              <>
                                <button
                                  className="p-1.5 text-green-600 hover:bg-green-500 hover:text-white rounded-md transition-colors"
                                  title="Approve"
                                  onClick={() =>
                                    handleApprove(emp?._id, emp?.status, emp)
                                  }
                                  disabled={loadingApprove === emp._id}
                                >
                                  {loadingApprove === emp._id ? (
                                    <Loader className="h-5 w-5" />
                                  ) : (
                                    <FiCheck className="h-5 w-5" />
                                  )}
                                </button>
                                <button
                                  className="p-1.5 text-red-600 hover:bg-red-500 hover:text-white rounded-md transition-colors"
                                  title="Reject"
                                  onClick={() =>
                                    handleReject(emp._id, emp.status, emp)
                                  }
                                  disabled={loadingReject === emp._id}
                                >
                                  {loadingReject === emp._id ? (
                                    <Loader className="h-5 w-5" />
                                  ) : (
                                    <FiX className="h-5 w-5" />
                                  )}
                                </button>
                              </>
                            )}
                          {hasDeletePermission && (
                            <button
                              className="p-1.5 text-red-600 hover:bg-red-500 hover:text-white rounded-md transition-colors"
                              title="Delete"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Are you sure you want to delete this employee?"
                                  )
                                ) {
                                  handleDelete(emp._id);
                                }
                              }}
                              disabled={loadingDelete === emp._id}
                            >
                              {loadingDelete === emp._id ? (
                                <Loader className="h-5 w-5" />
                              ) : (
                                <RiDeleteBin6Line className="h-5 w-5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Add this row for Modified status remarks */}
                    {emp.status === "Modified" && (
                      <tr>
                        <td colSpan="7" className="px-4 py-3 bg-yellow-50">
                          <div className="space-y-3">
                            {/* Remarks Section */}
                            {emp.remark && (
                              <div className="flex items-start">
                                <span className="text-yellow-600 mr-2">📝</span>
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Remarks:</span>{" "}
                                  {emp.remark}
                                </div>
                              </div>
                            )}

                            {/* Modified Data Section */}
                            {emp.modifiedData && (
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
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                                      <h3 className="font-semibold text-gray-700">
                                        Previous Values
                                      </h3>
                                    </div>
                                    <div className="space-y-3">
                                      {Object.entries(
                                        emp.modifiedData.previous
                                      ).map(([key, value]) => (
                                        <div key={`prev-${key}`}>
                                          <div className="font-medium text-gray-600 flex items-baseline">
                                            <span className="inline-block min-w-[100px] capitalize">
                                              {key}:
                                            </span>
                                            <div className="flex-1">
                                              {Array.isArray(value) ? (
                                                <div className="flex flex-wrap gap-1">
                                                  {value.map((item, i) => (
                                                    <span
                                                      key={i}
                                                      className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full"
                                                    >
                                                      {item}
                                                    </span>
                                                  ))}
                                                </div>
                                              ) : (
                                                <span className="text-gray-800">
                                                  {value}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Current Data */}
                                  <div className="bg-blue-100 p-4 rounded-lg border border-blue-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                      <h3 className="font-semibold text-blue-700">
                                        New Values
                                      </h3>
                                    </div>
                                    <div className="space-y-3">
                                      {Object.entries(
                                        emp.modifiedData.current
                                      ).map(([key, value]) => (
                                        <div key={`curr-${key}`}>
                                          <div className="font-medium text-blue-600 flex items-baseline">
                                            <span className="inline-block min-w-[100px] capitalize">
                                              {key}:
                                            </span>
                                            <div className="flex-1">
                                              {Array.isArray(value) ? (
                                                <div className="flex flex-wrap gap-1">
                                                  {value.map((item, i) => (
                                                    <span
                                                      key={i}
                                                      className="bg-blue-50 text-white text-xs px-2 py-1 rounded-full"
                                                    >
                                                      {item}
                                                    </span>
                                                  ))}
                                                </div>
                                              ) : (
                                                <span className="text-blue-900">
                                                  {value}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
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
                                          emp.modifiedData.modified_by,
                                        employeeId: emp._id,
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
                                      {emp?.modifiedData?.modified_by?.name ||
                                        "Unknown"}
                                    </span>
                                  </span>
                                  <span className="mx-2">•</span>
                                  <span>
                                    {new Date(
                                      emp.modifiedData.modified_at
                                    ).toLocaleString()}
                                  </span>

                                  {/* Hover Card */}
                                  {hoveredUser?.modifiedBy?._id ===
                                    emp?.modifiedData?.modified_by?._id &&
                                    hoveredUser?.employeeId === emp?._id && (
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
        <div className="sm:hidden space-y-4">
          {currentItems.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <NoData
                title="No Employees Found"
                description="Try adjusting your search or filters"
              />
            </div>
          ) : (
            currentItems.map((emp) => (
              <div
                key={emp?._id}
                className="bg-white p-4 rounded-lg shadow border border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {emp?.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-gray-900">
                        {emp?.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        ID: {emp?.employee_id}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      emp.status === "Active"
                        ? "bg-green-100 text-green-800" // Green for active
                        : emp.status === "InActive"
                        ? "bg-red-100 text-red-800" // Red for inactive
                        : emp.status === "OnProcess"
                        ? "bg-blue-100 text-blue-800" // Blue for in-process
                        : emp.status === "Rejected"
                        ? "bg-rose-100 text-rose-800" // Rose/deep pink for rejected
                        : emp.status === "Deleted"
                        ? "bg-gray-200 text-gray-800" // Gray for deleted
                        : emp.status === "Modified"
                        ? "bg-amber-100 text-amber-800" // Amber/orange for modified
                        : "bg-gray-100 text-gray-800" // Default fallback
                    }`}
                  >
                    {emp?.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-sm text-gray-900">{emp?.email}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">Contact</p>
                    <p className="text-sm text-gray-500">{emp?.contact}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">Roles</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {emp?.roles.map((role, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            ["Admin", "General Manager", "Manager"].includes(
                              role
                            )
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                      {/* Joined: {new Date(emp.createdAt).toLocaleDateString()} */}
                      Joined: {emp?.joining_date.split("T")[0]}
                    </p>
                    <div className="flex flex-wrap space-x-3">
                      {emp?.status !== "OnProcess" &&
                        emp?.request_status !== "pending" && (
                          <button
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-center"
                            onClick={() => handleEdit(emp?._id)}
                          >
                            <FiEdit className="h-4 w-4 mr-1" />
                            Edit
                          </button>
                        )}

                      {DecisionMaker && emp?.request_status === "pending" && (
                        <>
                          <button
                            className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center justify-center"
                            onClick={() =>
                              handleApprove(emp._id, emp.status, emp)
                            }
                            disabled={loadingApprove === emp._id}
                          >
                            {loadingApprove === emp._id ? (
                              <Loader className="h-4 w-4 mr-1" />
                            ) : (
                              <FiCheck className="h-4 w-4 mr-1" />
                            )}
                            Approve
                          </button>
                          <button
                            className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center justify-center"
                            onClick={() =>
                              handleReject(emp._id, emp.status, emp)
                            }
                            disabled={loadingReject === emp._id}
                          >
                            {loadingReject === emp._id ? (
                              <Loader className="h-4 w-4 mr-1" />
                            ) : (
                              <FiX className="h-4 w-4 mr-1" />
                            )}
                            Reject
                          </button>
                        </>
                      )}
                      {hasDeletePermission && (
                        <button
                          className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center justify-center"
                          onClick={() => {
                            if (
                              confirm(
                                "Are you sure you want to delete this employee?"
                              )
                            ) {
                              handleDelete(emp._id);
                            }
                          }}
                          disabled={loadingDelete === emp._id}
                        >
                          {loadingDelete === emp._id ? (
                            <Loader className="h-4 w-4 mr-1" />
                          ) : (
                            <RiDeleteBin6Line className="h-4 w-4 mr-1" />
                          )}
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {emp.status === "Modified" && (
                  <div>
                    <div className="w-full px-4 py-3 bg-yellow-50 rounded-lg mb-3">
                      <div className="space-y-3">
                        {/* Remarks Section */}
                        {emp.remark && (
                          <div className="flex items-start">
                            <span className="text-yellow-600 mr-2">📝</span>
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">Remarks:</span>{" "}
                              {emp.remark}
                            </div>
                          </div>
                        )}

                        {/* Modified Data Section */}
                        {emp.modifiedData && (
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
                                    emp.modifiedData.previous
                                  ).map(([key, value]) => (
                                    <div
                                      key={`prev-${key}`}
                                      className="text-xs"
                                    >
                                      <div className="flex items-baseline">
                                        <span className="inline-block min-w-[60px] text-gray-500 capitalize truncate">
                                          {key}:
                                        </span>
                                        <div className="flex-1 ml-1">
                                          {Array.isArray(value) ? (
                                            <div className="flex flex-wrap gap-0.5">
                                              {value.map((item, i) => (
                                                <span
                                                  key={i}
                                                  className="bg-gray-500 text-white text-[10px] px-1.5 py-0.5 rounded-full"
                                                >
                                                  {item}
                                                </span>
                                              ))}
                                            </div>
                                          ) : (
                                            <span className="text-gray-700 truncate">
                                              {value}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
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
                                  {Object.entries(emp.modifiedData.current).map(
                                    ([key, value]) => (
                                      <div
                                        key={`curr-${key}`}
                                        className="text-xs"
                                      >
                                        <div className="flex items-baseline">
                                          <span className="inline-block min-w-[60px] text-blue-600 capitalize truncate">
                                            {key}:
                                          </span>
                                          <div className="flex-1 ml-1">
                                            {Array.isArray(value) ? (
                                              <div className="flex flex-wrap gap-0.5">
                                                {value.map((item, i) => (
                                                  <span
                                                    key={i}
                                                    className="bg-blue-50 text-white text-[10px] px-1.5 py-0.5 rounded-full"
                                                  >
                                                    {item}
                                                  </span>
                                                ))}
                                              </div>
                                            ) : (
                                              <span className="text-blue-700 truncate">
                                                {value}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Metadata - Mobile Optimized */}
                            <div className="mt-3 text-xs text-gray-500 relative">
                              <span
                                className="hover:underline cursor-pointer inline-block"
                                onMouseEnter={() =>
                                  setHoveredUser({
                                    modifiedBy: emp.modifiedData.modified_by,
                                    employeeId: emp._id,
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
                                  {emp?.modifiedData?.modified_by?.name ||
                                    "Unknown"}
                                </span>
                              </span>
                              <span className="mx-2">•</span>
                              <span>
                                {new Date(
                                  emp.modifiedData.modified_at
                                ).toLocaleString()}
                              </span>

                              {/* Mobile-Friendly Hover Card */}
                              {hoveredUser?.modifiedBy?._id ===
                                emp?.modifiedData?.modified_by?._id &&
                                hoveredUser?.employeeId === emp?._id && (
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
        {processedEmployees.length > 0 && (
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
                      {Math.min(indexOfLastItem, processedEmployees.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">
                      {processedEmployees.length}
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
                    {Math.min(indexOfLastItem, processedEmployees.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">
                    {processedEmployees.length}
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

export default EmployeeManagementPanel;
