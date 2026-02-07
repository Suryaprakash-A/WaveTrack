import { useFormik } from "formik";
import * as Yup from "yup";
import { useState, useEffect } from "react";
import Toast from "../../components/Toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getEmployeeByIdAPI,
  inActivateEmployeeAPI,
  resetPasswordAPI,
  updateEmployeeAPI,
} from "../../services/employeeServices";
import { Loader } from "lucide-react";
import { useSelector } from "react-redux";
import { getUserRoles } from "../../utils/jwt";
import { hasPermission } from "../../utils/auth";

const roleOptions = [
  { id: "Admin", label: "Admin" },
  { id: "General Manager", label: "General Manager" },
  { id: "Manager", label: "Manager" },
  { id: "Senior HR", label: "Senior HR" },
  { id: "HR", label: "HR" },
  { id: "Finance", label: "Finance" },
  { id: "Team Lead", label: "Team Lead" },
  { id: "Staff", label: "Staff" },
];

const UpdateEmployeeForm = ({ id, handleClose }) => {
  const [submissionStatus, setSubmissionStatus] = useState(null);

  const userRoles = getUserRoles();
  const changePasswordAuth = hasPermission(
    ["Admin", "General Manager", "Manager", "Senior HR"],
    userRoles
  );

  const {
    data: fetchedEmployee,
    isSuccess: fetchedSuccess,
    refetch,
  } = useQuery({
    queryFn: () => getEmployeeByIdAPI(id),
    queryKey: ["employeeByID", id],
    enabled: !!id,
    refetchOnWindowFocus: true,
    onError: (error) => console.error("Error fetching employees:", error),
    onSuccess: (data) => console.log("Employees fetched successfully", data),
  });

  const employeeData = fetchedEmployee?.data;

  // Update Mutation
  const {
    mutateAsync,
    isPending,
    isError,
    isSuccess: updateSavedSuccess,
  } = useMutation({
    mutationFn: updateEmployeeAPI,
    mutationKey: ["updateEmployee"],
  });

  //Active and InActive Mutation
  const {
    mutateAsync: inActivateEmployee,
    isLoading: inActivateLoading,
    isSuccess: inActivateSuccess,
  } = useMutation({
    mutationFn: () => inActivateEmployeeAPI(id, employeeData.status),
    mutationKey: ["inActivateEmployee", id],
  });

  //Reset Password Mutation
  const {
    mutateAsync: resetPassword,
    isLoading: resetPasswordLoading,
    isSuccess: resetPasswordSuccess,
  } = useMutation({
    mutationFn: () => resetPasswordAPI(id),
    mutationKey: ["resetPassword", id],
  });

  const handleInActivate = () => {
    inActivateEmployee()
      .then((response) => {
        setSubmissionStatus({
          type: "success",
          message: response?.message ?? "Employee InActivation in Process",
        });
        refetch();
        setTimeout(() => handleClose(), 3000);
      })
      .catch((error) => {
        setSubmissionStatus({
          type: "error",
          message:
            error?.response?.data?.error ??
            error?.message ??
            "Failed to InActivate Employee",
        });
      });
  };

  const handlePasswordReset = () => {
    resetPassword()
      .then((response) => {
        setSubmissionStatus({
          type: "success",
          message: response?.message ?? "Password Reset Success",
        });
        refetch();
        setTimeout(() => handleClose(), 3000);
      })
      .catch((error) => {
        setSubmissionStatus({
          type: "error",
          message:
            error?.response?.data?.error ??
            error?.message ??
            "Failed to Reset Password",
        });
      });
  };

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      contact: "",
      roles: [],
      remark: "",
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(3, "Must be at least 3 characters")
        .max(50, "Must be 50 characters or less")
        .required("Required"),
      email: Yup.string()
        .email("Invalid email address")
        .required("Required")
        .transform((value) => value.toLowerCase().trim()),
      contact: Yup.string()
        .matches(/^\d+$/, "Must contain only digits")
        .min(10, "Must be exactly 10 digits")
        .max(10, "Must be exactly 10 digits")
        .required("Required"),
      roles: Yup.array()
        .min(1, "Select at least one role")
        .required("Required"),
      remark: Yup.string()
        .max(200, "Must be 200 characters or less")
        .required("Required"),
    }),
    onSubmit: async (values) => {
      try {
        const trimmedValues = {
          ...values,
          name: values?.name.trim(),
          remark: values?.remark.trim(),
          email: values?.email.trim().toLowerCase(),
        };

        await mutateAsync({ id: employeeData._id, data: trimmedValues })
          .then(() => {
            setSubmissionStatus({
              type: "success",
              message: "Update request submitted for approval!",
            });
            formik.resetForm();
            // fetchedSuccess = false;
            setTimeout(() => handleClose(), 3000);
          })
          .catch((error) => {
            setSubmissionStatus({
              type: "error",
              message:
                error?.response?.data?.error ??
                error?.message ??
                "Failed to submit update request",
            });
          });
      } catch (error) {
        setSubmissionStatus({
          type: "error",
          message:
            error?.response?.data?.error ??
            error?.message ??
            "Failed to submit update request",
        });
      }
    },
  });

  // Pre-fill form when employee data loads
  useEffect(() => {
    if (employeeData) {
      formik.setValues({
        name: employeeData?.name || "",
        email: employeeData?.email || "",
        contact: employeeData?.contact || "",
        roles: employeeData?.roles || [],
        remark: employeeData?.remark || "",
      });
    }
    refetch();
  }, [employeeData, id]);

  const handleRoleChange = (roleId, isChecked) => {
    if (isChecked) {
      formik.setFieldValue("roles", [...formik.values.roles, roleId]);
    } else {
      formik.setFieldValue(
        "roles",
        formik.values.roles.filter((id) => id !== roleId)
      );
    }
  };

  const handleEmailChange = (e) => {
    formik.setFieldValue("email", e.target.value.toLowerCase());
  };

  const handleContactChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    formik.setFieldValue("contact", value);
  };

  return (
    <>
      {submissionStatus && (
        <Toast
          type={submissionStatus.type}
          message={submissionStatus.message}
          onClose={() => setSubmissionStatus(null)}
        />
      )}
      <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto hide-scrollbar">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Employee Details
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
          <div>
            {updateSavedSuccess ? (
              <div>
                <Loader className="animate-spin h-6 w-6 text-blue-600 mx-auto" />
                <p className="text-center text-gray-700 mt-4">
                  Updating Employee Details...
                </p>
              </div>
            ) : fetchedSuccess ? (
              <form onSubmit={formik.handleSubmit} className="space-y-6">
                <div className="space-y-5">
                  {/* Name Field */}
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        value={formik.values.name}
                        className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                          formik.touched.name && formik.errors.name
                            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                            : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                        placeholder="John Doe"
                      />
                    </div>
                    {formik.touched.name && formik.errors.name && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {formik.errors.name}
                      </p>
                    )}
                  </div>

                  {/* Email Field */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        onChange={handleEmailChange}
                        onBlur={formik.handleBlur}
                        value={formik.values.email}
                        className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                          formik.touched.email && formik.errors.email
                            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                            : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                        placeholder="john@example.com"
                      />
                    </div>
                    {formik.touched.email && formik.errors.email && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {formik.errors.email}
                      </p>
                    )}
                  </div>

                  {/* Contact Field */}
                  <div>
                    <label
                      htmlFor="contact"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Contact Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="contact"
                        name="contact"
                        type="tel"
                        autoComplete="tel"
                        onChange={handleContactChange}
                        onBlur={formik.handleBlur}
                        value={formik.values.contact}
                        className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                          formik.touched.contact && formik.errors.contact
                            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                            : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                        placeholder="1234567890"
                        maxLength={10}
                      />
                    </div>
                    {formik.touched.contact && formik.errors.contact && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {formik.errors.contact}
                      </p>
                    )}
                  </div>

                  {/* Roles Checkbox Group */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Roles <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => formik.setFieldValue("roles", [])}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {roleOptions.map((option) => (
                        <div
                          key={option.id}
                          className="relative flex items-start"
                        >
                          <div className="flex items-center h-5">
                            <input
                              id={`role-${option.id}`}
                              name="roles"
                              type="checkbox"
                              checked={formik.values.roles.includes(option.id)}
                              onChange={(e) =>
                                handleRoleChange(option.id, e.target.checked)
                              }
                              onBlur={formik.handleBlur}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </div>
                          <div className="ml-2.5 text-sm">
                            <label
                              htmlFor={`role-${option.id}`}
                              className="text-gray-700"
                            >
                              {option.label}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                    {formik.touched.roles && formik.errors.roles && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {formik.errors.roles}
                      </p>
                    )}
                  </div>

                  {/* Remark Textarea */}
                  <div>
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

                {/* Status and Actions */}
                <div className="space-y-4">
                  {submissionStatus && (
                    <Toast
                      type={submissionStatus.type}
                      message={submissionStatus.message}
                      onClose={() => setSubmissionStatus(null)}
                    />
                  )}
                  <div className="flex justify-between gap-3">
                    <div className="flex space-x-3">
                      {changePasswordAuth && (
                        <button
                          type="button"
                          onClick={handlePasswordReset}
                          disabled={resetPasswordSuccess}
                          className="px-4 py-2.5 rounded-md text-sm font-medium text-amber-100 bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                        >
                          Reset Password
                        </button>
                      )}

                      {(employeeData.status === "Active" ||
                        employeeData.status === "InActive") && (
                        <button
                          type="button"
                          onClick={handleInActivate}
                          disabled={inActivateSuccess}
                          className={`px-4 py-2.5 rounded-md text-sm font-medium text-amber-100 ${
                            employeeData.status === "Active"
                              ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
                              : "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                          } focus:outline-none focus:ring-2 focus:ring-offset-2  disabled:opacity-70 disabled:cursor-not-allowed transition-colors`}
                        >
                          {employeeData.status === "Active"
                            ? "InActivate"
                            : "Activate"}
                        </button>
                      )}
                    </div>
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
                            Saving...
                          </span>
                        ) : (
                          "Save Changes"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div>
                <Loader className="animate-spin h-6 w-6 text-blue-600 mx-auto" />
                <p className="text-center text-gray-700 mt-4">
                  Fetching Employee Details...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UpdateEmployeeForm;
