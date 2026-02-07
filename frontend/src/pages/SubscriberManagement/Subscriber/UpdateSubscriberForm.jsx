import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { format, addMonths, parseISO } from "date-fns";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createSubscriberAPI,
  getSubscriberByIdAPI,
  suspendSubscriberAPI,
  updateSubscriberAPI,
} from "../../../services/subscriberServices";
import { deepTrim } from "../../../utils/trim";
import Toast from "../../../components/Toast";
import { Loader } from "lucide-react";

const UpdateSubscriberForm = ({ id, handleClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);

  const {
    data: fetchedSubscriber,
    isSuccess: fetchedSuccess,
    refetch: refetchSub,
  } = useQuery({
    queryFn: () => getSubscriberByIdAPI(id),
    queryKey: ["subscriberByID", id],
    enabled: !!id,
    refetchOnWindowFocus: true,
    onError: (error) => console.error("Error fetching subscriber:", error),
    onSuccess: (data) => console.log("Subscriber fetched successfully", data),
  });

  const subscriberData = fetchedSubscriber?.data;

  //Active and Suspend Mutation
  const {
    mutateAsync: suspendSubscriberMutate,
    isLoading: inSuspendLoading,
    isSuccess: inSuspendSuccess,
  } = useMutation({
    mutationFn: () => suspendSubscriberAPI(id, subscriberData.status),
    mutationKey: ["suspendSubscriber", id],
  });

  const handleSuspend = async () => {
    await suspendSubscriberMutate()
      .then((response) => {
        setSubmissionStatus({
          type: "success",
          message: response?.message ?? "Subscriber Suspension in Process",
        });
        setTimeout(() => handleClose(), 3000);
      })
      .catch((error) => {
        setSubmissionStatus({
          type: "error",
          message:
            error?.response?.data?.error ??
            error?.message ??
            "Failed to Suspend Subscriber",
        });
      });
  };

  // Update Mutation
  const {
    mutateAsync: updateSubscriberMutate,
    isPending,
    isError,
    isSuccess: updateSubscriberSuccess,
  } = useMutation({
    mutationFn: updateSubscriberAPI,
    mutationKey: ["updateSubscriber"],
  });

  // Form validation schema
  const validationSchema = Yup.object().shape({
    customerName: Yup.string().required("Customer name is required"),
    siteName: Yup.string().required("Site name is required"),
    siteCode: Yup.string(),
    siteAddress: Yup.string().required("Site address is required"),
    localContact: Yup.object().shape({
      name: Yup.string().required("Contact name is required"),
      contact: Yup.string()
        .required("Contact number is required")
        .min(10, "Must be exactly 10 digits")
        .max(10, "Must be exactly 10 digits")
        .matches(/^[0-9\-+ ]+$/, "Invalid phone number"),
    }),
    ispInfo: Yup.object().shape({
      name: Yup.string().required("ISP name is required"),
      contact: Yup.string()
        .required("ISP contact number is required")
        .min(10, "Must be exactly 10 digits")
        .max(10, "Must be exactly 10 digits")
        .matches(/^[0-9\-+ ]+$/, "Invalid phone number"),
      broadbandPlan: Yup.string().required("Broadband plan is required"),
      numberOfMonths: Yup.number()
        .required("Number of months is required")
        .min(1, "Must be at least 1 month")
        .integer("Must be a whole number"),
      otc: Yup.number().min(0, "Cannot be negative"),
      mrc: Yup.number()
        .required("MRC is required")
        .min(0, "Cannot be negative"),
    }),
    credentials: Yup.object().shape({
      username: Yup.string(),
      password: Yup.string(),
      circuitId: Yup.string(),
      accountId: Yup.string(),
    }),
    remark: Yup.string()
      .max(200, "Must be 200 characters or less")
      .required("Required"),
  });

  const formik = useFormik({
    initialValues: {
      customerName: "",
      siteName: "",
      siteCode: "",
      siteAddress: "",
      localContact: {
        name: "",
        contact: "",
      },
      ispInfo: {
        name: "",
        contact: "",
        broadbandPlan: "",
        numberOfMonths: 1,
        otc: 0,
        mrc: 0,
      },
      credentials: {
        username: "",
        password: "",
        circuitId: "",
        accountId: "",
      },
      remarks: "",
    },

    validationSchema, // Make sure to update your validation schema accordingly
    onSubmit: async (values) => {
      setIsSubmitting(true);
      try {
        // Trim all string values (including nested ones) before processing
        const trimmedValues = deepTrim(values);

        const updatedSub = {
          ...trimmedValues,
        };

        await updateSubscriberMutate({ id: id, data: updatedSub })
          .then(() => {
            setSubmissionStatus({
              type: "success",
              message: "Subscriber sent for Approval!",
            });
            formik.resetForm();
            setTimeout(() => {
              setIsSubmitting(false);
              handleClose();
            }, 3000);
          })
          .catch((error) => {
            console.error("Error editing Subscriber:", error);
            setIsSubmitting(false);
            setSubmissionStatus({
              type: "error",
              message:
                error?.response?.data?.error ??
                error?.message ??
                "Failed to editing subscriber",
            });
          });
      } catch (error) {
        setIsSubmitting(false);
        setSubmissionStatus({
          type: "error",
          message:
            error?.response?.data?.error ??
            error?.message ??
            "Failed to editing subscriber",
        });
      }
    },
  });

  // Pre-fill form when subscriber data loads
  useEffect(() => {
    if (subscriberData) {
      formik.setValues({
        customerName: subscriberData?.customerName || "",
        siteName: subscriberData?.siteName || "",
        siteCode: subscriberData?.siteCode || "",
        siteAddress: subscriberData?.siteAddress || "",
        localContact: {
          name: subscriberData?.localContact?.name || "",
          contact: subscriberData?.localContact?.contact || "",
        },
        ispInfo: {
          name: subscriberData?.ispInfo?.name || "",
          contact: subscriberData?.ispInfo?.contact || "",
          broadbandPlan: subscriberData?.ispInfo?.broadbandPlan || "",
          numberOfMonths: subscriberData?.ispInfo?.numberOfMonths || 1,
          otc: subscriberData?.ispInfo?.otc || 0,
          mrc: subscriberData?.ispInfo?.mrc || 0,
        },
        credentials: {
          username: subscriberData?.credentials?.username || "",
          password: subscriberData?.credentials?.password || "",
          circuitId: subscriberData?.credentials?.circuitId || "",
          accountId: subscriberData?.credentials?.accountId || "",
        },
        remark: subscriberData?.remark || "",
      });
    }
    refetchSub();
  }, [subscriberData, id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto hide-scrollbar">
        {submissionStatus && (
          <Toast
            type={submissionStatus.type}
            message={submissionStatus.message}
            onClose={() => setSubmissionStatus(null)}
          />
        )}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Subscriber Details
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
        {/* Form goes here */}
        {updateSubscriberSuccess ? (
          <div>
            <Loader className="animate-spin h-6 w-6 text-blue-600 mx-auto" />
            <p className="text-center text-gray-700 mt-4">
              Updating Subscriber Details...
            </p>
          </div>
        ) : fetchedSuccess ? (
          <div>
            <form onSubmit={formik.handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Site Information */}
                <div className="sm:col-span-2">
                  <h4 className="text-md font-medium text-gray-900 border-b-2">
                    Site Information
                  </h4>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="siteName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="customerName"
                      name="customerName"
                      type="text"
                      value={formik.values.customerName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                        formik.touched.customerName &&
                        formik.errors.customerName
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                      placeholder="Aspirare / Alliant"
                    />
                  </div>
                  {formik.touched.customerName &&
                    formik.errors.customerName && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {formik.errors.customerName}
                      </p>
                    )}
                </div>

                <div>
                  <label
                    htmlFor="siteName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Site Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="siteName"
                      name="siteName"
                      type="text"
                      value={formik.values.siteName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                        formik.touched.siteName && formik.errors.siteName
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                      placeholder="Zudio / FreeCharge"
                    />
                  </div>
                  {formik.touched.siteName && formik.errors.siteName && (
                    <p className="mt-1.5 text-sm text-red-600">
                      {formik.errors.siteName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="siteCode"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Site Code
                  </label>
                  <div className="relative">
                    <input
                      id="siteCode"
                      name="siteCode"
                      type="text"
                      value={formik.values.siteCode}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                        formik.touched.siteCode && formik.errors.siteCode
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                      placeholder="Z112"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="siteAddress"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Site Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="siteAddress"
                    name="siteAddress"
                    rows={3}
                    maxLength={200}
                    value={formik.values.siteAddress}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`block w-full rounded-md shadow-sm border py-2 px-3.5 ${
                      formik.touched.siteAddress && formik.errors.siteAddress
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                    placeholder="Address..."
                  />
                  {formik.touched.siteAddress && formik.errors.siteAddress && (
                    <p className="mt-1.5 text-sm text-red-600">
                      {formik.errors.siteAddress}
                    </p>
                  )}
                </div>

                {/* Local Contact */}
                <div>
                  <label
                    htmlFor="localContact.name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Local Contact Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="localContact.name"
                      name="localContact.name"
                      value={formik.values.localContact?.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                        formik.touched.localContact?.name &&
                        formik.errors.localContact?.name
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                    />
                  </div>
                  {formik.touched.localContact?.name &&
                    formik.errors.localContact?.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {formik.errors.localContact?.name}
                      </p>
                    )}
                </div>

                <div>
                  <label
                    htmlFor="localContact.contact"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Local Contact Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      id="localContact.contact"
                      name="localContact.contact"
                      value={formik.values.localContact?.contact}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      maxLength={10}
                      className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                        formik.touched.localContact?.contact &&
                        formik.errors.localContact?.contact
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                    />
                  </div>
                  {formik.touched.localContact?.contact &&
                    formik.errors.localContact?.contact && (
                      <p className="mt-1 text-sm text-red-600">
                        {formik.errors.localContact.contact}
                      </p>
                    )}
                </div>

                {/* ISP Information */}
                <div className="sm:col-span-2">
                  <h2 className="text-lg font-medium text-gray-900 border-b-2">
                    ISP Information
                  </h2>
                </div>

                <div>
                  <label
                    htmlFor="ispInfo.name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    ISP Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="ispInfo.name"
                      name="ispInfo.name"
                      value={formik.values.ispInfo?.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                        formik.touched.ispInfo?.name &&
                        formik.errors.ispInfo?.name
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                    />
                  </div>
                  {formik.touched.ispInfo?.name &&
                    formik.errors.ispInfo?.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {formik.errors.ispInfo.name}
                      </p>
                    )}
                </div>

                <div>
                  <label
                    htmlFor="ispInfo.contact"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    ISP Contact <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      id="ispInfo.contact"
                      name="ispInfo.contact"
                      value={formik.values.ispInfo?.contact}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      maxLength={10}
                      className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                        formik.touched.ispInfo?.contact &&
                        formik.errors.ispInfo?.contact
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                    />
                  </div>
                  {formik.touched.ispInfo?.contact &&
                    formik.errors.ispInfo?.contact && (
                      <p className="mt-1 text-sm text-red-600">
                        {formik.errors.ispInfo.contact}
                      </p>
                    )}
                </div>

                {/* Service Information */}
                <div className="sm:col-span-2">
                  <h2 className="text-lg font-medium text-gray-900 border-b-2">
                    Service Information
                  </h2>
                </div>

                <div>
                  <label
                    htmlFor="ispInfo.broadbandPlan"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Broadband Plan <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="ispInfo.broadbandPlan"
                      name="ispInfo.broadbandPlan"
                      value={formik.values.ispInfo?.broadbandPlan}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      placeholder="100Mbps"
                      className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                        formik.touched.ispInfo?.broadbandPlan &&
                        formik.errors.ispInfo?.broadbandPlan
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                    />
                  </div>
                  {formik.touched.ispInfo?.broadbandPlan &&
                    formik.errors.ispInfo?.broadbandPlan && (
                      <p className="mt-1 text-sm text-red-600">
                        {formik.errors.ispInfo.broadbandPlan}
                      </p>
                    )}
                </div>

                <div>
                  <label
                    htmlFor="ispInfo.numberOfMonths"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Number of Months <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="ispInfo.numberOfMonths"
                      name="ispInfo.numberOfMonths"
                      min="1"
                      value={formik.values.ispInfo?.numberOfMonths}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                        formik.touched.ispInfo?.numberOfMonths &&
                        formik.errors.ispInfo?.numberOfMonths
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                    />
                  </div>
                  {formik.touched.ispInfo?.numberOfMonths &&
                    formik.errors.ispInfo?.numberOfMonths && (
                      <p className="mt-1 text-sm text-red-600">
                        {formik.errors.ispInfo.numberOfMonths}
                      </p>
                    )}
                </div>

                <div>
                  <label
                    htmlFor="ispInfo.otc"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    One Time Charges (OTC){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div>
                    <div className="relative flex items-center gap-2">
                      <span className="text-gray-900 sm:text-lg">₹</span>
                      <input
                        type="number"
                        id="ispInfo.otc"
                        name="ispInfo.otc"
                        min="0"
                        value={formik.values.ispInfo?.otc}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                          formik.touched.ispInfo?.otc &&
                          formik.errors.ispInfo?.otc
                            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                            : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                      />
                    </div>
                  </div>
                  {formik.touched.ispInfo?.otc &&
                    formik.errors.ispInfo?.otc && (
                      <p className="mt-1 text-sm text-red-600">
                        {formik.errors.ispInfo?.otc}
                      </p>
                    )}
                </div>

                <div>
                  <label
                    htmlFor="ispInfo.mrc"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Recurring Charges (MRC){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div>
                    <div className="relative flex items-center gap-2">
                      <span className="text-gray-900 sm:text-lg">₹</span>
                      <input
                        type="number"
                        id="ispInfo.mrc"
                        name="ispInfo.mrc"
                        min="0"
                        value={formik.values.ispInfo?.mrc}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                          formik.touched.ispInfo?.mrc &&
                          formik.errors.ispInfo?.mrc
                            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                            : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                      />
                    </div>
                  </div>
                  {formik.touched.ispInfo?.mrc &&
                    formik.errors.ispInfo?.mrc && (
                      <p className="mt-1 text-sm text-red-600">
                        {formik.errors.ispInfo?.mrc}
                      </p>
                    )}
                </div>

                {/* Credentials */}
                <div className="sm:col-span-2">
                  <h2 className="text-lg font-medium text-gray-900 border-b-2">
                    Credentials
                  </h2>
                </div>

                <div>
                  <label
                    htmlFor="credentials.circuitId"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Circuit ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="credentials.circuitId"
                      name="credentials.circuitId"
                      value={formik.values.credentials.circuitId}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                        formik.touched.credentials?.circuitId &&
                        formik.errors.credentials?.circuitId
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                    />
                  </div>
                  {formik.touched.credentials?.circuitId &&
                    formik.errors.credentials?.circuitId && (
                      <p className="mt-1 text-sm text-red-600">
                        {formik.errors.credentials.circuitId}
                      </p>
                    )}
                </div>

                <div>
                  <label
                    htmlFor="credentials.accountId"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Account ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="credentials.accountId"
                      name="credentials.accountId"
                      value={formik.values.credentials.accountId}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                        formik.touched.credentials?.accountId &&
                        formik.errors.credentials?.accountId
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                    />
                  </div>
                  {formik.touched.credentials?.accountId &&
                    formik.errors.credentials?.accountId && (
                      <p className="mt-1 text-sm text-red-600">
                        {formik.errors.credentials.accountId}
                      </p>
                    )}
                </div>

                <div>
                  <label
                    htmlFor="credentials.username"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="credentials.username"
                      name="credentials.username"
                      value={formik.values.credentials?.username}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                        formik.touched.credentials?.username &&
                        formik.errors.credentials?.username
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                    />
                  </div>
                  {formik.touched.credentials?.username &&
                    formik.errors.credentials?.username && (
                      <p className="mt-1 text-sm text-red-600">
                        {formik.errors.credentials?.username}
                      </p>
                    )}
                </div>

                <div>
                  <label
                    htmlFor="credentials.password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="credentials.password"
                      name="credentials.password"
                      value={formik.values.credentials?.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                        formik.touched.credentials?.password &&
                        formik.errors.credentials?.password
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                    />
                  </div>
                  {formik.touched.credentials?.password &&
                    formik.errors.credentials?.password && (
                      <p className="mt-1 text-sm text-red-600">
                        {formik.errors.credentials?.password}
                      </p>
                    )}
                </div>

                {/* Remark Textarea */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor="remark"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Remark <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="remark"
                    name="remark"
                    rows={3}
                    maxLength={200}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.remark}
                    className={`block w-full rounded-md shadow-sm border py-2 px-3.5 ${
                      formik.touched.remark && formik.errors.remark
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                    placeholder="Explain what changes you're making..."
                  />
                  {formik.touched.remark && formik.errors.remark && (
                    <p className="mt-1.5 text-sm text-red-600">
                      {formik.errors.remark}
                    </p>
                  )}
                </div>
              </div>

              {/* Form buttons remain the same */}
              <div className="flex justify-between space-x-3 pt-4 border-t border-gray-200">
                {(subscriberData.status === "Active" ||
                  subscriberData.status === "InActive" ||
                  subscriberData.status === "Suspended") && (
                  <button
                    type="button"
                    onClick={handleSuspend}
                    disabled={inSuspendSuccess}
                    className={`px-4 py-2.5 rounded-md text-sm font-medium text-amber-100 ${
                      subscriberData.status === "Active" ||
                      subscriberData.status === "InActive"
                        ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
                        : "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                    } focus:outline-none focus:ring-2 focus:ring-offset-2  disabled:opacity-70 disabled:cursor-not-allowed transition-colors`}
                  >
                    {subscriberData.status === "Active" ||
                    subscriberData.status === "InActive"
                      ? "Suspend"
                      : "Activate"}
                  </button>
                )}
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
                    disabled={isSubmitting || !formik.isValid}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
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
                        Processing...
                      </>
                    ) : (
                      "Save Details"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <Loader className="animate-spin h-6 w-6 text-blue-600 mx-auto" />
            <p className="text-center text-gray-700 mt-4">
              Fetching Subscriber Details...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateSubscriberForm;
