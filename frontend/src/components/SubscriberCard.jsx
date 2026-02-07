import { useEffect, useState } from "react";
import { FiUser, FiWifi, FiCalendar, FiMapPin, FiEdit } from "react-icons/fi";
import UpdateSubscriberForm from "../pages/SubscriberManagement/Subscriber/UpdateSubscriberForm";
import UserHoverCard from "./UserHoverCard";
import { useNavigate } from "react-router-dom";
import {
  approveSubscriberAPI,
  deleteSubscriberAPI,
  rejectSubscriberAPI,
} from "../services/subscriberServices";
import Toast from "./Toast";
import { Loader } from "lucide-react";
import { getUserRoles } from "../utils/jwt";
import { hasPermission } from "../utils/auth";
import { useMutation } from "@tanstack/react-query";

const SubscriberCard = ({ subscriber, refetch }) => {
  const userRoles = getUserRoles();
  const DecisionMaker = hasPermission(
    ["Admin", "General Manager", "Manager", "Senior HR"],
    userRoles
  );

  const hasDeletePermission = hasPermission(
    ["Admin", "General Manager"],
    userRoles
  );

  const navigate = useNavigate();

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

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
    subscriberId: null,
  });

  const [isUpdateSubscriberFormOpen, setIsUpdateSubscriberFormOpen] =
    useState(false);

  const [selectedSubscriberId, setSelectedSubscriberId] = useState(null);
  const [loadingApprove, setLoadingApprove] = useState(null);
  const [loadingReject, setLoadingReject] = useState(null);
  const [loadingDelete, setLoadingDelete] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);

  const handleEdit = async (id) => {
    setSelectedSubscriberId(id);
    setIsUpdateSubscriberFormOpen(true);
  };

  const handleCloseEdit = () => {
    refetch();
    setSelectedSubscriberId(null);
    setIsUpdateSubscriberFormOpen(false);
  };

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
      // Call your API to reject the employee
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
      // console.error("Error rejecting employee:", error);
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

  //Delete Employee Mutation
  const { mutateAsync: deleteSubscriber } = useMutation({
    mutationFn: deleteSubscriberAPI,
    mutationKey: ["deleteSubscriber"],
  });

  const handleDelete = async (subscriberId) => {
    setLoadingDelete(subscriberId);
    try {
      // Call your API to delete the employee
      const response = await deleteSubscriber(subscriberId);

      // Refresh the subscriber
      setTimeout(() => {
        navigate("/subscriber-management");
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

  return (
    <div className="bg-white h-fit rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition duration-300">
      {isUpdateSubscriberFormOpen && (
        <UpdateSubscriberForm
          id={selectedSubscriberId}
          handleClose={handleCloseEdit}
        />
      )}
      {submissionStatus && (
        <Toast
          type={submissionStatus.type}
          message={submissionStatus.message}
          onClose={() => setSubmissionStatus(null)}
        />
      )}
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 px-4 py-2 text-white w-full flex items-center justify-between">
        <div>
          <div className="space-x-2">
            <span className="text-lg font-bold">{subscriber?.siteName}</span>
            <span className="text-md opacity-90 font-medium">
              ( {subscriber?.siteCode} )
            </span>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <div className="bg-blue-100 text-blue-700 px-1 rounded text-sm font-mono w-fit">
              ID: {subscriber?.subscriber_id}
            </div>
            <div className="rounded text-sm font-mono w-fit">
              {subscriber?.customerName || "—"}
            </div>
          </div>
        </div>
        <div>
          {subscriber?.request_status !== "pending" && (
            <button
              className="p-1.5 text-white-600 hover:bg-white hover:text-blue-500 rounded-md transition-colors"
              title="Edit"
              onClick={() => handleEdit(subscriber?._id)}
            >
              <FiEdit className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Address */}
        <div className="flex items-start">
          <FiMapPin className="text-gray-400 mt-1 mr-2" />
          <p className="text-sm text-gray-700">{subscriber?.siteAddress}</p>
        </div>
        {/* Grid info */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          {/* Contact Info */}
          <div className="bg-gray-50 rounded-lg p-2 border">
            <h4 className="flex items-center font-semibold text-gray-700 mb-1">
              <FiUser className="mr-2" /> Local Contact
            </h4>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Name:</span>{" "}
              {subscriber?.localContact?.name}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Contact:</span>{" "}
              {subscriber?.localContact?.contact}
            </p>
          </div>

          {/* ISP Info */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h4 className="flex items-center font-semibold text-gray-700 mb-2">
              <FiWifi className="mr-2" /> ISP Details
            </h4>
            <div className="space-y-2 grid grid-cols-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Provider:</span>{" "}
                {subscriber?.ispInfo?.name}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Contact:</span>{" "}
                {subscriber?.ispInfo?.contact}
              </p>

              <p className="text-sm text-gray-600">
                <span className="font-medium">Plan:</span>{" "}
                {subscriber?.ispInfo?.broadbandPlan}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Months:</span>{" "}
                {subscriber?.ispInfo?.numberOfMonths}
              </p>

              <p className="text-sm text-gray-600">
                <span className="font-medium">OTC:</span> ₹{" "}
                {subscriber?.ispInfo?.otc}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">MRC:</span> ₹{" "}
                {subscriber?.ispInfo?.mrc}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Account Id:</span>{" "}
                {subscriber?.credentials?.accountId || "—"}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Circuit Id:</span>{" "}
                {subscriber?.credentials?.circuitId || "—"}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Username:</span>{" "}
                {subscriber?.credentials?.username || "—"}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Password:</span>{" "}
                {subscriber?.credentials?.password || "—"}
              </p>
            </div>
          </div>

          {/* Dates + Status */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h4 className="flex items-center font-semibold text-gray-700 mb-2">
              <FiCalendar className="mr-2" /> Dates & Status
            </h4>
            <div className="space-y-2 grid grid-cols-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Delivered:</span>{" "}
                {formatDate(subscriber?.activationDate)}
              </p>
              <p className="text-sm text-gray-600 flex items-center">
                <span className="font-medium mr-1">Status:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-md font-medium ${
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
                  {subscriber?.status}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Activation:</span>{" "}
                {formatDate(
                  subscriber?.ispInfo?.currentActivationDate?.split("T")[0]
                )}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Renewal:</span>{" "}
                {formatDate(subscriber?.ispInfo?.renewalDate)}
              </p>
            </div>
          </div>
        </div>
        {/* Created / Updated / ID */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-gray-500 relative">
            <p>
              Created By:{" "}
              <span
                className="text-blue-500 hover:underline hover:cursor-pointer"
                onMouseEnter={() => {
                  setHoveredUser({
                    modifiedBy: subscriber?.created_by,
                    subscriberId: subscriber?._id,
                  });
                }}
                onMouseLeave={() =>
                  setHoveredUser({
                    modifiedBy: null,
                    subscriberId: null,
                  })
                }
              >
                {subscriber?.created_by?.name}
              </span>
            </p>
            {/* Hover Card */}
            {hoveredUser?.modifiedBy?._id === subscriber?.created_by?._id &&
              hoveredUser?.subscriberId === subscriber?._id && (
                <UserHoverCard userData={hoveredUser} />
              )}
            <p>
              Authorized By:{" "}
              <span
                className="text-blue-500 hover:underline hover:cursor-pointer"
                onMouseEnter={() => {
                  setHoveredUser({
                    modifiedBy: subscriber?.decision_by,
                    subscriberId: subscriber?._id,
                  });
                }}
                onMouseLeave={() =>
                  setHoveredUser({
                    modifiedBy: null,
                    subscriberId: null,
                  })
                }
              >
                {subscriber?.decision_by?.name}
              </span>
            </p>
            {/* Hover Card */}
            {hoveredUser?.modifiedBy?._id === subscriber?.decision_by?._id &&
              hoveredUser?.subscriberId === subscriber?._id && (
                <UserHoverCard userData={hoveredUser} />
              )}
          </div>

          <div className="text-xs text-gray-500">
            <p>Created: {formatDate(subscriber?.createdAt)}</p>
            <p>Updated: {formatDate(subscriber?.updatedAt)}</p>
          </div>
        </div>
        {(subscriber?.status === "Modified" || subscriber?.remark) && (
          <div>
            <div className="w-full px-4 py-3 bg-yellow-50 rounded-lg mb-3">
              <div className="space-y-3">
                {/* Remarks Section */}
                {subscriber?.remark && (
                  <div className="flex items-start">
                    <span className="text-yellow-600 mr-2">📝</span>
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Remarks:</span>{" "}
                      {subscriber?.remark}
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
                        <span className="text-yellow-600 mr-2">🔄</span>
                        <span className="text-sm font-medium text-gray-700">
                          Changes:
                        </span>
                      </div>

                      {/* Responsive Grid - Stacks on mobile */}
                      <div className="grid grid-cols-1 gap-2">
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
                                  <div key={`prev-${key}`} className="text-xs">
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
                                                  {getDisplayName(nestedKey)}:
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
                                <div key={`prev-${key}`} className="text-xs">
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
                                  <div key={`curr-${key}`} className="text-xs">
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
                                              JSON.stringify(nestedValue) !==
                                              JSON.stringify(prevNestedValue);

                                            return (
                                              <div
                                                key={`nested-${nestedKey}`}
                                                className="mb-1 last:mb-0"
                                              >
                                                <div className="flex items-baseline">
                                                  <span className="inline-block min-w-[40px] text-blue-500 text-[10px] capitalize">
                                                    {getDisplayName(nestedKey)}:
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
                                <div key={`curr-${key}`} className="text-xs">
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
                              modifiedBy: subscriber.modifiedData.modified_by,
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
                            {subscriber?.modifiedData?.modified_by?.name ||
                              "Unknown"}
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
        <div className="grid grid-cols-3 gap-2">
          {hasDeletePermission && (
            <button
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 rounded"
              onClick={() => {
                if (
                  confirm("Are you sure you want to delete this Subscriber?")
                ) {
                  handleDelete(subscriber?._id);
                }
              }}
              disabled={loadingDelete === subscriber?._id}
            >
              {loadingDelete === subscriber?._id ? (
                <Loader className="h-5 w-5 animate-spin justify-self-center" />
              ) : (
                "Delete"
              )}
            </button>
          )}

          {DecisionMaker && subscriber?.request_status === "pending" && (
            <>
              <button
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-2 rounded"
                onClick={() =>
                  handleApprove(subscriber._id, subscriber.status, subscriber)
                }
                disabled={loadingApprove === subscriber?._id}
              >
                {loadingApprove === subscriber?._id ? (
                  <Loader className="h-5 w-5 animate-spin justify-self-center" />
                ) : (
                  "Approve"
                )}
              </button>

              <button
                className="bg-rose-500 hover:bg-rose-600 text-white font-semibold py-1 px-2 rounded"
                onClick={() =>
                  handleReject(subscriber._id, subscriber.status, subscriber)
                }
                disabled={loadingReject === subscriber?._id}
              >
                {loadingReject === subscriber?._id ? (
                  <Loader className="h-5 w-5 animate-spin justify-self-center" />
                ) : (
                  "Reject"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriberCard;
