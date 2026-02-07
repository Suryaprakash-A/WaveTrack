import { useFormik } from "formik";
import * as Yup from "yup";
import { useState, useEffect } from "react";
import Toast from "../../components/Toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createTicketAPI } from "../../services/ticketServices";
import { Loader } from "lucide-react";
import { FiSearch, FiX, FiChevronDown, FiCheck } from "react-icons/fi";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { getSubscribersAPI } from "../../services/subscriberServices";
import { getEmployeesAPI } from "../../services/employeeServices";

const priorityOptions = [
  { id: "Low", label: "Low" },
  { id: "Medium", label: "Medium" },
  { id: "High", label: "High" },
];

const AddTicketForm = ({ handleClose }) => {
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [showSubscriberDropdown, setShowSubscriberDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [filteredSubscribers, setFilteredSubscribers] = useState([]);
  const [filteredAssignees, setFilteredAssignees] = useState([]);

  // Fetch subscribers and employees data
  const { data: subscribers = [] } = useQuery({
    queryKey: ["subscribers"],
    queryFn: getSubscribersAPI,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployeesAPI,
  });

  // Filter employees to only include Team Leads and Staff
  const eligibleAssignees = employees?.data?.filter((employee) =>
    employee.roles.some((role) => ["Team Lead", "Staff"].includes(role))
  );

  // Add Ticket Mutation
  const {
    mutateAsync: createTicketMutate,
    isPending,
    isError,
    isSuccess: addSuccess,
    error,
  } = useMutation({
    mutationFn: createTicketAPI,
    mutationKey: ["createTicket"],
  });

  const formik = useFormik({
    initialValues: {
      subscriber: null, // will store the selected subscriber object
      issueTitle: "",
      issueDescription: "",
      priority: "Medium",
      assignedTo: null, // will store the selected employee object
    },
    validationSchema: Yup.object({
      subscriber: Yup.object().required("Subscriber is required"),
      issueTitle: Yup.string()
        .min(5, "Must be at least 5 characters")
        .max(100, "Must be 100 characters or less")
        .required("Required"),
      issueDescription: Yup.string()
        .min(10, "Must be at least 10 characters")
        .max(500, "Must be 500 characters or less")
        .required("Required"),
      priority: Yup.string().required("Required"),
      assignedTo: Yup.object().required("Assignee is required"),
    }),
    onSubmit: async (values) => {
      try {
        const ticketData = {
          subscriberId: values.subscriber._id,
          issueTitle: values.issueTitle.trim(),
          issueDescription: values.issueDescription.trim(),
          priority: values.priority,
          assignedTo: values.assignedTo._id,
          issueRaisedDate: new Date(),
        };

        await createTicketMutate(ticketData)
          .then(() => {
            setSubmissionStatus({
              type: "success",
              message: "Ticket created successfully!",
            });
            formik.resetForm();
            setTimeout(() => {
              handleClose();
            }, 2000);
          })
          .catch((error) => {
            console.error("Error creating ticket:", error);
            setSubmissionStatus({
              type: "error",
              message:
                error?.response?.data?.error ??
                error?.message ??
                "Failed to create ticket",
            });
          });
      } catch (error) {
        setSubmissionStatus({
          type: "error",
          message:
            error?.response?.data?.error ??
            error?.message ??
            "Failed to create ticket",
        });
      }
    },
  });

  // Filter subscribers based on search input
  const handleSubscriberSearch = (e) => {
    const searchTerm = e.target.value.toLowerCase();
    if (searchTerm.length < 2) {
      setFilteredSubscribers([]);
      return;
    }

    const filtered = subscribers?.data
      ?.filter((subscriber) => {
        return (
          subscriber.siteCode.toLowerCase().includes(searchTerm) ||
          subscriber.siteAddress.toLowerCase().includes(searchTerm) ||
          subscriber.subscriber_id.toLowerCase().includes(searchTerm)
        );
      })
      .slice(0, 5); // Limit to 5 results

    setFilteredSubscribers(filtered);
    setShowSubscriberDropdown(filtered.length > 0);
  };

  // Select a subscriber from dropdown
  const selectSubscriber = (subscriber) => {
    formik.setFieldValue("subscriber", subscriber);
    setShowSubscriberDropdown(false);
  };

  // Filter assignees based on search input
  const handleAssigneeSearch = (e) => {
    const searchTerm = e.target.value.toLowerCase();
    if (searchTerm.length < 2) {
      setFilteredAssignees([]);
      return;
    }

    const filtered = eligibleAssignees
      .filter((employee) => {
        return (
          employee.name.toLowerCase().includes(searchTerm) ||
          employee.employee_id.toLowerCase().includes(searchTerm)
        );
      })
      .slice(0, 5); // Limit to 5 results

    setFilteredAssignees(filtered);
    setShowAssigneeDropdown(filtered.length > 0);
  };

  // Select an assignee from dropdown
  const selectAssignee = (employee) => {
    formik.setFieldValue("assignedTo", employee);
    setShowAssigneeDropdown(false);
  };

  // Clear subscriber selection
  const clearSubscriber = () => {
    formik.setFieldValue("subscriber", null);
  };

  // Clear assignee selection
  const clearAssignee = () => {
    formik.setFieldValue("assignedTo", null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto hide-scrollbar">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Create New Ticket
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {!addSuccess ? (
          <form onSubmit={formik.handleSubmit} className="space-y-6">
            <div className="space-y-5">
              {/* Subscriber Search Field */}
              <div>
                <label
                  htmlFor="subscriber"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Subscriber <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  {formik.values.subscriber ? (
                    <div className="flex items-center justify-between p-2 border border-gray-300 rounded-md bg-gray-50">
                      <div>
                        <p className="text-sm font-medium">
                          {formik.values.subscriber.siteCode} -{" "}
                          {formik.values.subscriber.siteAddress}
                        </p>
                        <p className="text-xs text-gray-500">
                          ID: {formik.values.subscriber.subscriber_id}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearSubscriber}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiSearch className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          id="subscriber"
                          name="subscriber"
                          type="text"
                          autoComplete="off"
                          onChange={handleSubscriberSearch}
                          className={`block w-full pl-10 pr-3 py-2 rounded-md shadow-sm border ${
                            formik.touched.subscriber &&
                            formik.errors.subscriber
                              ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                              : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                          } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                          placeholder="Search by site code, address, or ID..."
                        />
                      </div>
                      {showSubscriberDropdown && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto max-h-60">
                          {filteredSubscribers.map((subscriber) => (
                            <div
                              key={subscriber.subscriber_id}
                              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
                              onClick={() => selectSubscriber(subscriber)}
                            >
                              <div className="flex items-center">
                                <span className="font-medium truncate">
                                  {subscriber.siteCode} -{" "}
                                  {subscriber.siteAddress}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {subscriber.subscriber_id}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {formik.touched.subscriber && formik.errors.subscriber && (
                  <p className="mt-1.5 text-sm text-red-600">
                    {formik.errors.subscriber}
                  </p>
                )}
              </div>

              {/* Issue Title Field */}
              <div>
                <label
                  htmlFor="issueTitle"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Issue Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="issueTitle"
                  name="issueTitle"
                  type="text"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.issueTitle}
                  className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                    formik.touched.issueTitle && formik.errors.issueTitle
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                  placeholder="Brief description of the issue"
                />
                {formik.touched.issueTitle && formik.errors.issueTitle && (
                  <p className="mt-1.5 text-sm text-red-600">
                    {formik.errors.issueTitle}
                  </p>
                )}
              </div>

              {/* Issue Description Field */}
              <div>
                <label
                  htmlFor="issueDescription"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Issue Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="issueDescription"
                  name="issueDescription"
                  rows={4}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.issueDescription}
                  className={`block w-full rounded-md shadow-sm border py-2 px-3.5 ${
                    formik.touched.issueDescription &&
                    formik.errors.issueDescription
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                  placeholder="Detailed description of the issue..."
                />
                {formik.touched.issueDescription &&
                  formik.errors.issueDescription && (
                    <p className="mt-1.5 text-sm text-red-600">
                      {formik.errors.issueDescription}
                    </p>
                  )}
              </div>

              {/* Priority Dropdown */}
              <div>
                <label
                  htmlFor="priority"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  id="priority"
                  name="priority"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.priority}
                  className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                    formik.touched.priority && formik.errors.priority
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                >
                  {priorityOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {formik.touched.priority && formik.errors.priority && (
                  <p className="mt-1.5 text-sm text-red-600">
                    {formik.errors.priority}
                  </p>
                )}
              </div>

              {/* Assignee Search Field */}
              <div>
                <label
                  htmlFor="assignedTo"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Assign To <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  {formik.values.assignedTo ? (
                    <div className="flex items-center justify-between p-2 border border-gray-300 rounded-md bg-gray-50">
                      <div>
                        <p className="text-sm font-medium">
                          {formik.values.assignedTo.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          <span className="font-semibold">ID:</span>{" "}
                          {formik.values.assignedTo.employee_id} |
                          <span className="font-semibold"> Roles:</span>{" "}
                          {formik.values.assignedTo.roles.join(", ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearAssignee}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiSearch className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          id="assignedTo"
                          name="assignedTo"
                          type="text"
                          autoComplete="off"
                          onChange={handleAssigneeSearch}
                          className={`block w-full pl-10 pr-3 py-2 rounded-md shadow-sm border ${
                            formik.touched.assignedTo &&
                            formik.errors.assignedTo
                              ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                              : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                          } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                          placeholder="Search by name or ID..."
                        />
                      </div>
                      {showAssigneeDropdown && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto max-h-60">
                          {filteredAssignees.map((employee) => (
                            <div
                              key={employee._id}
                              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
                              onClick={() => selectAssignee(employee)}
                            >
                              <div className="flex items-center">
                                <span className="font-medium truncate">
                                  {employee.name}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {employee.employee_id} | Roles:{" "}
                                {employee.roles.join(", ")}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {formik.touched.assignedTo && formik.errors.assignedTo && (
                  <p className="mt-1.5 text-sm text-red-600">
                    {formik.errors.assignedTo}
                  </p>
                )}
              </div>
            </div>

            {/* Status and Actions */}
            <div className="space-y-4">
              {submissionStatus && (
                <Toast
                  type={submissionStatus.type}
                  message={submissionStatus.message}
                  onClose={() => setSubmissionStatus(null)}
                />
              )}

              <div className="flex justify-between space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => formik.resetForm()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowPathIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                  Reset
                </button>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2.5 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formik.isSubmitting}
                    className="px-4 py-2.5 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                  >
                    {formik.isSubmitting ? (
                      <span className="flex items-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                        Creating...
                      </span>
                    ) : (
                      "Create Ticket"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
            </div>
            <h3 className="mt-3 text-lg font-medium text-gray-900">
              Ticket Created Successfully!
            </h3>
            <div className="mt-2 text-sm text-gray-500">
              <p>The ticket has been created and assigned.</p>
            </div>
            <div className="mt-5">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddTicketForm;
