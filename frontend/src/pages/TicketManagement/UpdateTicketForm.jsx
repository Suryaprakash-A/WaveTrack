import { useFormik } from "formik";
import * as Yup from "yup";
import { useState, useEffect } from "react";
import Toast from "../../components/Toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getTicketByIdAPI,
  resolveTicketAPI,
  updateTicketAPI,
} from "../../services/ticketServices";
import { Loader } from "lucide-react";
import { FiMapPin } from "react-icons/fi";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { FaRegThumbsUp } from "react-icons/fa";

const UpdateTicketForm = ({ id, handleClose }) => {
  const [submissionStatus, setSubmissionStatus] = useState(null);

  const {
    data: fetchedTicket,
    isSuccess: fetchedSuccess,
    refetch: refetchTicket,
  } = useQuery({
    queryFn: () => getTicketByIdAPI(id),
    queryKey: ["ticketByID", id],
    enabled: !!id,
    refetchOnWindowFocus: true,
    onError: (error) => console.error("Error fetching ticket:", error),
    onSuccess: (data) => console.log("Ticket fetched successfully", data),
  });

  const ticket = fetchedTicket?.data;

  // Update Ticket Mutation
  const {
    mutateAsync: updateTicketMutate,
    isPending,
    isError,
    isSuccess: updateSuccess,
    error,
  } = useMutation({
    mutationFn: updateTicketAPI,
    mutationKey: ["updateTicket"],
  });

  const formik = useFormik({
    initialValues: {
      ispTicketId: "",
      note: "",
    },
    validationSchema: Yup.object({
      ispTicketId: Yup.string().required("ISP Ticket is required"),
      note: Yup.string()
        .min(5, "Must be at least 5 characters")
        .max(500, "Must be 100 characters or less")
        .required("Required"),
    }),
    onSubmit: async (values) => {
      try {
        const updatedTicketData = {
          ispTicketId: values.ispTicketId,
          note: values.note,
        };

        await updateTicketMutate({ id: id, data: updatedTicketData })
          .then(() => {
            setSubmissionStatus({
              type: "success",
              message: "Ticket updated successfully!",
            });
            formik.resetForm();
            setTimeout(() => {
              handleClose();
            }, 2000);
          })
          .catch((error) => {
            console.error("Error updating ticket:", error);
            setSubmissionStatus({
              type: "error",
              message:
                error?.response?.data?.error ??
                error?.message ??
                "Failed to update ticket",
            });
          });
      } catch (error) {
        setSubmissionStatus({
          type: "error",
          message:
            error?.response?.data?.error ??
            error?.message ??
            "Failed to update ticket",
        });
      }
    },
  });

  useEffect(() => {
    if (ticket) {
      formik.setValues({
        ispTicketId: ticket?.ispTicketId || "", // Set the default value here
        note: ticket?.note || "",
      });
    }
    refetchTicket();
  }, [ticket, id]);

  //Resolve Mutation
  const {
    mutateAsync: resolveTicketMutate,
    isLoading: inResolveLoading,
    isSuccess: inResolveSuccess,
  } = useMutation({
    mutationFn: () =>
      resolveTicketAPI(id, ticket?.status, formik.values.note.trim()),
    mutationKey: ["resolveTicket", id],
  });

  const handleResolved = async () => {
    await resolveTicketMutate()
      .then((response) => {
        setSubmissionStatus({
          type: "success",
          message: response?.message ?? "Ticket Resolved in Process",
        });
        setTimeout(() => handleClose(), 3000);
      })
      .catch((error) => {
        setSubmissionStatus({
          type: "error",
          message:
            error?.response?.data?.error ??
            error?.message ??
            "Failed to Resolve Ticket",
        });
      });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      {submissionStatus && (
        <Toast
          type={submissionStatus.type}
          message={submissionStatus.message}
        />
      )}
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto hide-scrollbar">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Update Ticket</h3>
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

        {!fetchedSuccess ? (
          <Loader className="flex justify-center items-center animate-spin text-blue-500" />
        ) : !updateSuccess ? (
          <form onSubmit={formik.handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                {ticket?.issueTitle}
              </h2>

              <p className="text-gray-600 text-sm mb-4 flex-1">
                {ticket?.issueDescription}
              </p>
              <div className="flex flex-col items-center text-sm text-gray-600">
                <span className="text-xs text-black font-semibold">
                  {ticket?.subscriberId?.siteCode} {" - "}
                  {ticket?.subscriberId?.siteName}
                </span>
                <div className="flex items-center pt-2 ">
                  <FiMapPin className="mr-2 text-gray-400 flex-shrink-0" />
                  <span className="">{ticket?.subscriberId?.siteAddress}</span>
                </div>
              </div>
              {/* ISP Ticket ID Field */}
              <div>
                <label
                  htmlFor="ispTicketId"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  ISP Ticket ID <span className="text-red-500">*</span>
                </label>
                <input
                  id="ispTicketId"
                  name="ispTicketId"
                  type="text"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.ispTicketId}
                  className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                    formik.touched.ispTicketId && formik.errors.ispTicketId
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                  placeholder="Ticket ID provided by ISP"
                />
                {formik.touched.ispTicketId && formik.errors.ispTicketId && (
                  <p className="mt-1.5 text-sm text-red-600">
                    {formik.errors.ispTicketId}
                  </p>
                )}
              </div>

              {/* Note Description Field */}
              <div>
                <label
                  htmlFor="note"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Note <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="note"
                  name="note"
                  rows={4}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.note}
                  className={`block w-full rounded-md shadow-sm border py-2 px-3.5 ${
                    formik.touched.note && formik.errors.note
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                  placeholder="Some notes toward resolving the issue..."
                />
                {formik.touched.note && formik.errors.note && (
                  <p className="mt-1.5 text-sm text-red-600">
                    {formik.errors.note}
                  </p>
                )}
              </div>
            </div>

            {/* Status and Actions */}
            <div className="space-y-4">
              <div className="flex justify-between space-x-3 pt-4 border-t border-gray-200">
                {(ticket?.status === "In Progress" ||
                  ticket?.status === "Critical") &&
                  ticket?.note && (
                    <button
                      type="button"
                      onClick={handleResolved}
                      disabled={inResolveSuccess}
                      className="inline-flex items-center px-4 py-2 border border-green-600 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                    >
                      {inResolveSuccess ? (
                        <Loader className="animate-spin text-blue-500 " />
                      ) : (
                        <>
                          <FaRegThumbsUp className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                          Resolved
                        </>
                      )}
                    </button>
                  )}
                <div className="flex w-full justify-end space-x-3">
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
                        Updating...
                      </span>
                    ) : (
                      "Update Ticket"
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
              Ticket Updated Successfully!
            </h3>
            <div className="mt-2 text-sm text-gray-500">
              <p>The ticket has been updated and In Progress Now.</p>
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

export default UpdateTicketForm;
