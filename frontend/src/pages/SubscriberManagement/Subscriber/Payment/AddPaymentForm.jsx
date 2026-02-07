import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { format, addMonths, parseISO } from "date-fns";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { FiX } from "react-icons/fi";
import { Loader } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { deepTrim } from "../../../../utils/trim";
import Toast from "../../../../components/Toast";
import { createPaymentAPI } from "../../../../services/paymentServices";

const AddPaymentForm = ({ handleClose, subscriber, paymentsLength }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);

  // New Payment Mutation
  const {
    mutateAsync: addPaymentMutate,
    isSuccess: addPaymentSuccess,
    isLoading,
    error,
  } = useMutation({
    mutationFn: createPaymentAPI,
    mutationKey: ["createPayment"],
  });

  // Form validation schema
  const validationSchema = Yup.object().shape({
    transactionType: Yup.string()
      .required("Transaction type is required")
      .oneOf(["Income", "Expense"], "Invalid transaction type"),
    transactionMode: Yup.string()
      .required("Transaction mode is required")
      .oneOf(
        ["UPI", "Debit Card", "Credit Card", "Net Banking"],
        "Invalid transaction mode"
      ),
    // transactionDate: Yup.date()
    //   .required("Transaction date is required")
    //   .max(new Date(), "Transaction date cannot be in the future"),
    amount: Yup.number()
      .required("Amount is required")
      .min(1, "Amount must be at least 1"),
    activationDate: Yup.date().required("Activation date is required"),
    // .max(new Date(), "Activation date cannot be in the future"),
    expiryDate: Yup.date().required("Expiry date is required"),
  });

  const formik = useFormik({
    initialValues: {
      transactionType: "",
      transactionMode: "",
      transactionDate: "",
      amount: "",
      activationDate: "",
      expiryDate: "",
    },

    validationSchema, // Make sure to update your validation schema accordingly
    onSubmit: async (values) => {
      setIsSubmitting(true);
      try {
        // Trim all string values (including nested ones) before processing
        const trimmedValues = deepTrim(values);

        // console.log(trimmedValues);

        const newPayment = {
          ...trimmedValues,
          subscriberId: subscriber._id,
          transactionDate: format(new Date(), "yyyy-MM-dd"),
        };

        console.log(newPayment);

        await addPaymentMutate(newPayment)
          .then(() => {
            setSubmissionStatus({
              type: "success",
              message: "Payment added successfully!",
            });
            formik.resetForm();
            setTimeout(() => {
              setIsSubmitting(false);
              handleClose();
            }, 3000);
          })
          .catch((error) => {
            console.error("Error adding Payment:", error);
            setIsSubmitting(false);
            setSubmissionStatus({
              type: "error",
              message:
                error?.response?.data?.error ??
                error?.message ??
                "Failed to add Payment",
            });
          });
      } catch (error) {
        setIsSubmitting(false);
        setSubmissionStatus({
          type: "error",
          message:
            error?.response?.data?.error ??
            error?.message ??
            "Failed to add Payment",
        });
      }
    },
  });

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    formik.setFieldValue("transactionType", newType);

    if (newType === "Expense" && subscriber) {
      let activationDate =
        subscriber?.ispInfo?.currentActivationDate.split("T")[0];
      let expiryDate = subscriber?.ispInfo?.renewalDate.split("T")[0];

      if (paymentsLength >= 1) {
        // For subsequent payments, set activation date to 1 day after renewal date
        const renewalDate = new Date(subscriber?.ispInfo?.renewalDate);
        renewalDate.setDate(renewalDate.getDate() + 1);
        activationDate = renewalDate.toISOString().split("T")[0];

        // Calculate expiry date by adding numberOfMonths to activation date
        const newExpiryDate = new Date(activationDate);
        newExpiryDate.setMonth(
          newExpiryDate.getMonth() + subscriber?.ispInfo?.numberOfMonths
        );
        expiryDate = newExpiryDate.toISOString().split("T")[0];
      }

      formik.setFieldValue("activationDate", activationDate);
      formik.setFieldValue("expiryDate", expiryDate);
      formik.setFieldValue("amount", subscriber?.ispInfo?.mrc);
      formik.setFieldValue("transactionMode", "");
    } else if (newType === "Income") {
      formik.setFieldValue("activationDate", "");
      formik.setFieldValue("expiryDate", "");
      formik.setFieldValue("amount", "");
      formik.setFieldValue("transactionMode", "");
    }
  };

  // Handler for manual activation date changes
  const handleActivationDateChange = (e) => {
    const newDate = e.target.value;
    formik.setFieldValue("activationDate", newDate);

    if (formik.values.transactionType === "Expense" && subscriber) {
      // Calculate expiry date by adding numberOfMonths to the selected date
      const activationDate = new Date(newDate);
      const expiryDate = new Date(activationDate);
      expiryDate.setMonth(
        activationDate.getMonth() + subscriber?.ispInfo?.numberOfMonths
      );

      // Format to YYYY-MM-DD (HTML date input format)
      const formattedExpiryDate = expiryDate.toISOString().split("T")[0];
      formik.setFieldValue("expiryDate", formattedExpiryDate);
    }
  };

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
            Register New Payment
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>
        {!addPaymentSuccess ? (
          <div>
            <form onSubmit={formik.handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div
                  className={`${
                    !formik.values.transactionType && "col-span-2"
                  }`}
                >
                  <div>
                    <label
                      htmlFor="transactionType"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Transaction Type
                    </label>
                    <select
                      className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                        formik.touched.transactionType &&
                        formik.errors.transactionType
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } ${
                        formik.values.transactionType === "Income"
                          ? "border-2 ring-green-500 border-green-500"
                          : formik.values.transactionType === "Expense"
                          ? "border-2 ring-rose-500 border-rose-500"
                          : ""
                      } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                      name="transactionType"
                      value={formik.values.transactionType}
                      onChange={handleTypeChange}
                      onBlur={formik.handleBlur}
                    >
                      <option value="">Select Type</option>
                      <option value="Income">Income</option>
                      <option value="Expense">Expense</option>
                    </select>
                  </div>
                  {formik.touched.transactionType &&
                    formik.errors.transactionType && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {formik.errors.transactionType}
                      </p>
                    )}
                </div>

                {formik.values.transactionType && (
                  <>
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
                          <option value="">Select Mode</option>
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
                          onChange={(e) => {
                            formik.handleChange(e);
                            handleActivationDateChange(e);
                          }}
                          onBlur={formik.handleBlur}
                          disabled={
                            formik.values.transactionType === "Expense" &&
                            paymentsLength <= 1
                          }
                          className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                            formik.touched.activationDate &&
                            formik.errors.activationDate
                              ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                              : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                          } ${
                            formik.values.transactionType === "Expense" &&
                            "bg-gray-100"
                          }  focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
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
                          disabled={formik.values.transactionType === "Expense"}
                          className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                            formik.touched.expiryDate &&
                            formik.errors.expiryDate
                              ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                              : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                          } ${
                            formik.values.transactionType === "Expense" &&
                            "bg-gray-100"
                          }  focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                        />
                      </div>
                      {formik.touched.expiryDate &&
                        formik.errors.expiryDate && (
                          <p className="mt-1 text-sm text-red-600">
                            {formik.errors.expiryDate}
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
                            disabled={
                              formik.values.transactionType === "Expense"
                            }
                            className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                              formik.touched.amount && formik.errors.amount
                                ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                            } ${
                              formik.values.transactionType === "Expense" &&
                              "bg-gray-100"
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
                  </>
                )}
              </div>

              {/* Form buttons remain the same */}
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
                    disabled={isSubmitting || !formik.isValid}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : formik.values.transactionType === "Expense" ? (
                      "Plan Renewed"
                    ) : (
                      "Payment Received"
                    )}
                  </button>
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
              Creating Payment...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddPaymentForm;
