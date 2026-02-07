import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation } from "@tanstack/react-query";
import Toast from "../../components/Toast";
import { changePasswordAPI } from "../../services/authServices";
import { useState } from "react";

const ChangePasswordForm = ({ id, handleClose }) => {
  const [submissionStatus, setSubmissionStatus] = useState(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: changePasswordAPI,
    mutationKey: ["changePassword", id],
  });

  const formik = useFormik({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      currentPassword: Yup.string().required("Current password is required"),
      newPassword: Yup.string()
        .min(6, "Must be at least 6 characters")
        .required("New password is required"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("newPassword")], "Passwords must match")
        .required("Confirm your new password"),
    }),
    onSubmit: async (values) => {
      try {
        const response = await mutateAsync({
          id,
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        })
          .then(() => {
            setSubmissionStatus({
              type: "success",
              message: "Password changed successfully",
            });
          })
          .finally(() => {
            formik.resetForm();
            setTimeout(() => handleClose(), 2000);
          });
      } catch (error) {
        setSubmissionStatus({
          type: "error",
          message: error?.response?.data?.error ?? "Failed to change password",
        });
      }
    },
  });

  return (
    <>
      {submissionStatus && (
        <Toast
          type={submissionStatus.type}
          message={submissionStatus.message}
          onClose={() => setSubmissionStatus(null)}
        />
      )}
      <div className="fixed inset-0 bg-black/40 z-50 flex justify-center items-center">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-gray-800">
              Change Password
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500"
            >
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

          <form onSubmit={formik.handleSubmit} className="space-y-5">
            {["currentPassword", "newPassword", "confirmPassword"].map(
              (field) => (
                <div key={field}>
                  <label
                    htmlFor={field}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {field === "currentPassword"
                      ? "Current Password"
                      : field === "newPassword"
                      ? "New Password"
                      : "Confirm Password"}
                  </label>
                  <input
                    id={field}
                    name={field}
                    type="text"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values[field]}
                    className={`block w-full rounded-md py-2 px-3.5 shadow-sm border ${
                      formik.touched[field] && formik.errors[field]
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    } focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm`}
                    placeholder={`Enter ${field.replace(/([A-Z])/g, " $1")}`}
                  />
                  {formik.touched[field] && formik.errors[field] && (
                    <p className="text-sm text-red-600 mt-1.5">
                      {formik.errors[field]}
                    </p>
                  )}
                </div>
              )
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formik.isSubmitting || isPending}
                className="px-4 py-2.5 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70"
              >
                {isPending ? "Saving..." : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ChangePasswordForm;
