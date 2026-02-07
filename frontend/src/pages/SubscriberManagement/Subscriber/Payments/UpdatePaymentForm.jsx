import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { format, addMonths, parseISO } from "date-fns";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { FiX } from "react-icons/fi";
import { Loader } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { deepTrim } from "../../../../utils/trim";
import Toast from "../../../../components/Toast";
import {
  createPaymentAPI,
  getPaymentByIdAPI,
  updatePaymentAPI,
} from "../../../../services/paymentServices";

const UpdatePaymentForm = ({ id, handleClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);

  // Fetch payment data by ID
  const {
    data: fetchedPayment,
    isSuccess: fetchedSuccess,
    refetch: refetchPayment,
  } = useQuery({
    queryFn: () => getPaymentByIdAPI(id),
    queryKey: ["paymentByID", id],
    enabled: !!id,
    refetchOnWindowFocus: true,
    onError: (error) => console.error("Error fetching payment:", error),
    onSuccess: (data) => console.log("Payment fetched successfully", data),
  });

  const paymentData = fetchedPayment?.data;

  // Update Payment Mutation
  const {
    mutateAsync: updatePaymentMutate,
    isSuccess: updatePaymentSuccess,
    isLoading,
    error,
  } = useMutation({
    mutationFn: updatePaymentAPI,
    mutationKey: ["updatePayment"],
  });

  // Form validation schema
  const validationSchema = Yup.object().shape({
    transactionMode: Yup.string()
      .required("Transaction mode is required")
      .oneOf(
        ["UPI", "Debit Card", "Credit Card", "Net Banking"],
        "Invalid transaction mode"
      ),
    amount: Yup.number()
      .required("Amount is required")
      .min(1, "Amount must be at least 1"),
    activationDate: Yup.date().required("Activation date is required"),
    expiryDate: Yup.date().required("Expiry date is required"),
    remark: Yup.string()
      .max(200, "Must be 200 characters or less")
      .required("Required"),
  });

  const formik = useFormik({
    initialValues: {
      transactionMode: "",
      amount: "",
      activationDate: "",
      expiryDate: "",
      remark: "",
    },

    validationSchema, // Make sure to update your validation schema accordingly
    onSubmit: async (values) => {
      setIsSubmitting(true);
      try {
        // Trim all string values (including nested ones) before processing
        const trimmedValues = deepTrim(values);

        const updatedPayment = {
          ...trimmedValues,
        };

        console.log(updatedPayment);

        await updatePaymentMutate({ id: id, data: updatedPayment })
          .then(() => {
            setSubmissionStatus({
              type: "success",
              message: "Payment updated successfully!",
            });
            formik.resetForm();
            setTimeout(() => {
              setIsSubmitting(false);
              handleClose();
            }, 3000);
          })
          .catch((error) => {
            console.error("Error updating Payment:", error);
            setIsSubmitting(false);
            setSubmissionStatus({
              type: "error",
              message:
                error?.response?.data?.error ??
                error?.message ??
                "Failed to update Payment",
            });
          });
      } catch (error) {
        setIsSubmitting(false);
        setSubmissionStatus({
          type: "error",
          message:
            error?.response?.data?.error ??
            error?.message ??
            "Failed to update Payment",
        });
      }
    },
  });

  // Pre-fill form when payment data loads
  useEffect(() => {
    if (paymentData) {
      formik.setValues({
        transactionMode: paymentData?.transactionMode || "",
        amount: paymentData?.amount || "",
        activationDate: paymentData?.activationDate
          ? format(new Date(paymentData.activationDate), "yyyy-MM-dd")
          : "",
        expiryDate: paymentData?.expiryDate
          ? format(new Date(paymentData.expiryDate), "yyyy-MM-dd")
          : "",
      });
    }
    refetchPayment();
  }, [paymentData, id]);

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
          <h3 className="text-lg font-semibold text-gray-900 underline">
            Update Payment Details
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>
        {updatePaymentSuccess ? (
          <div>
            <Loader className="animate-spin h-6 w-6 text-blue-600 mx-auto" />
            <p className="text-center text-gray-700 mt-4">
              Updating Payment Details...
            </p>
          </div>
        ) : fetchedSuccess ? (
          <div>
            <form onSubmit={formik.handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <div>
                    <label
                      htmlFor="transactionMode"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Transaction Mode
                    </label>
                    <select
                      className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                        formik.touched.transactionMode &&
                        formik.errors.transactionMode
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                      name="transactionMode"
                      value={formik.values.transactionMode}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    >
                      <option value="UPI">UPI</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Net Banking">Net Banking</option>
                    </select>
                  </div>
                  {formik.touched.transactionMode &&
                    formik.errors.transactionMode && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {formik.errors.transactionMode}
                      </p>
                    )}
                </div>

                <div>
                  <label
                    htmlFor="amount"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div>
                    <div className="relative flex items-center gap-2">
                      <span className="text-gray-900 sm:text-lg">₹</span>
                      <input
                        type="number"
                        id="amount"
                        name="amount"
                        min="0"
                        value={formik.values.amount}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                          formik.touched.amount && formik.errors.amount
                            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                            : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                      />
                    </div>
                  </div>
                  {formik.touched.amount && formik.errors.amount && (
                    <p className="mt-1 text-sm text-red-600">
                      {formik.errors.amount}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="activationDate"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Activation Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center gap-2">
                    <input
                      type="date"
                      id="activationDate"
                      name="activationDate"
                      value={formik.values.activationDate}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                        formik.touched.activationDate &&
                        formik.errors.activationDate
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                    />
                  </div>
                  {formik.touched.activationDate &&
                    formik.errors.activationDate && (
                      <p className="mt-1 text-sm text-red-600">
                        {formik.errors.activationDate}
                      </p>
                    )}
                </div>

                <div>
                  <label
                    htmlFor="expiryDate"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center gap-2">
                    <input
                      type="date"
                      id="expiryDate"
                      name="expiryDate"
                      value={formik.values.expiryDate}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                        formik.touched.expiryDate && formik.errors.expiryDate
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                    />
                  </div>
                  {formik.touched.expiryDate && formik.errors.expiryDate && (
                    <p className="mt-1 text-sm text-red-600">
                      {formik.errors.expiryDate}
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
              <div className="justify-between space-x-3 pt-4 border-t border-gray-200">
                <div className="w-full flex items-center justify-end">
                  <div className="flex space-x-3">
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
                          <Loader className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Update"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div>
            {submissionStatus && (
              <Toast
                type={submissionStatus.type}
                message={submissionStatus.message}
                onClose={() => setSubmissionStatus(null)}
              />
            )}
            <Loader className="animate-spin h-6 w-6 text-blue-600 mx-auto" />
            <p className="text-center text-gray-700 mt-4">
              Fetching Payment Details...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdatePaymentForm;
