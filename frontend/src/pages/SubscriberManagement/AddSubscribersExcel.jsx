import React, { useState } from "react";
import Toast from "../../components/Toast";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { useMutation } from "@tanstack/react-query";
import { createBulkSubscribersAPI } from "../../services/subscriberServices";

const AddSubscribersExcel = ({ handleClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [fileUploading, setFileUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Add Bulk Subscribers Mutation
  const {
    mutateAsync: createBulkSubscriberMutate,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: createBulkSubscribersAPI,
    mutationKey: ["createBulkSubscribers"],
  });

  // Helper function to calculate renewal date
  const calculateRenewalDate = (activationDate, months) => {
    const date = new Date(activationDate);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split("T")[0];
  };

  // Validate Excel data before processing
  const validateExcelData = (data) => {
    const errors = [];

    data.forEach((row, index) => {
      const missingFields = [];
      const isValidNumber = (value) => {
        if (typeof value === "number")
          return Number.isInteger(value) && value >= 0;
        if (typeof value === "string") return /^[0-9]+$/.test(value.trim());
        return false;
      };

      // Check required fields
      if (!row.customerName) missingFields.push("Customer Name");
      if (!row.siteName) missingFields.push("Site Name");
      if (!row.siteCode) missingFields.push("Site Code");
      if (!row.siteAddress) missingFields.push("Site Address");
      if (!row.localContact?.name) missingFields.push("Local Contact Name");
      if (!row.localContact?.contact)
        missingFields.push("Local Contact Number");
      if (!row.ispInfo?.name) missingFields.push("ISP Name");
      if (!row.ispInfo?.contact) missingFields.push("ISP Contact");
      if (!row.ispInfo?.broadbandPlan) missingFields.push("Plan");
      if (!row.ispInfo?.numberOfMonths) missingFields.push("Months");
      if (row.ispInfo?.otc === undefined || row.ispInfo?.otc === null)
        missingFields.push("OTC");
      if (!row.ispInfo?.mrc) missingFields.push("MRC");
      if (!row.activationDate) missingFields.push("Activation Date");

      if (missingFields.length > 0) {
        errors.push(
          `Row ${index + 2}: Missing required fields - ${missingFields.join(
            ", "
          )}`
        );
      } else if (
        !row.localContact.contact ||
        row.localContact.contact.length !== 10
      ) {
        errors.push(
          `Row ${index + 2}: Valid LC Contact is required (10 digits)`
        );
      } else if (!row.ispInfo.contact || row.ispInfo.contact.length !== 10) {
        errors.push(
          `Row ${index + 2}: Valid ISP Contact is required (10 digits)`
        );
      } else if (!isValidNumber(row.ispInfo.numberOfMonths)) {
        errors.push(`Row ${index + 2}: Months must be a valid number`);
      } else if (!isValidNumber(row.ispInfo.otc)) {
        errors.push(`Row ${index + 2}: OTC must be a valid number`);
      } else if (!isValidNumber(row.ispInfo.mrc)) {
        errors.push(`Row ${index + 2}: MRC must be a valid number`);
      } else if (!isValidDate(row.activationDate)) {
        errors.push(
          `Row ${index + 2}: Invalid activation date. Must not a future date.`
        );
      }
    });

    return errors;
  };

  const isValidDate = (dateString) => {
    const regEx = /^\d{4}-\d{2}-\d{2}$/;
    if (!regEx.test(dateString)) return false;

    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;

    const inputDate = new Date(d.toISOString().split("T")[0]);
    const today = new Date(new Date().toISOString().split("T")[0]);

    return inputDate <= today;
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length) {
        setFileUploading(true);
        setValidationErrors([]);
        setSubmissionStatus(null);

        try {
          const file = acceptedFiles[0];

          // Check file size (max 5MB)
          if (file.size > 5 * 1024 * 1024) {
            throw new Error("File size exceeds 5MB limit");
          }

          const data = await file.arrayBuffer();
          const workbook = XLSX.read(data);

          // Check if workbook has at least one sheet
          if (workbook.SheetNames.length === 0) {
            throw new Error("Excel file contains no worksheets");
          }

          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Check if file has data
          if (jsonData.length === 0) {
            throw new Error("Excel file contains no data");
          }

          // Transform Excel data
          const formattedData = jsonData.map((row, index) => {
            const parseExcelDate = (excelSerial) => {
              const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Excel starts from 1899-12-30
              return new Date(excelEpoch.getTime() + excelSerial * 86400000)
                .toISOString()
                .split("T")[0]; // returns YYYY-MM-DD
            };
            let rawDate = row["Activation Date"];
            let formattedActivationDate = "";

            if (!isNaN(rawDate)) {
              // It's a number → Excel serial date
              formattedActivationDate = parseExcelDate(rawDate);
            }

            // const activationDate = row["Activation Date"]
            //   ? new Date(row["Activation Date"]).toISOString().split("T")[0]
            //   : "";
            const activationDate = formattedActivationDate
              ? new Date(formattedActivationDate).toISOString().split("T")[0]
              : "";

            return {
              customerName: row["Customer Name"]?.toString().trim() || "",
              siteName: row["Site Name"]?.toString().trim() || "",
              siteCode: row["Site Code"]?.toString().trim() || "",
              siteAddress: row["Address"]?.toString().trim() || "",
              localContact: {
                name: row["LC Name"]?.toString().trim() || "",
                contact: String(row["LC Contact"] || "").trim(),
              },
              ispInfo: {
                name: row["ISP Name"]?.toString().trim() || "",
                contact: String(row["ISP Contact"] || "").trim(),
                broadbandPlan: row["Plan"]?.toString().trim() || "",
                numberOfMonths: Number(row["Months"]) || row["Months"],
                otc: Number(row["OTC"]) || row["OTC"],
                mrc: Number(row["MRC"]) || row["MRC"],
                currentActivationDate: activationDate,
              },
              activationDate: activationDate,
              credentials: {
                username: row["Username"]?.toString().trim() || "",
                password: row["Password"]?.toString().trim() || "",
                circuitId: row["Circuit ID"]?.toString().trim() || "",
                accountId: row["Account ID"]?.toString().trim() || "",
              },
            };
          });

          // Validate the data
          const errors = validateExcelData(formattedData);
          if (errors.length > 0) {
            setValidationErrors(errors);
            setSubmissionStatus({
              type: "error",
              message: `Found ${errors.length} validation errors in the Excel file`,
            });
          } else {
            setExcelData(formattedData);
            setSubmissionStatus({
              type: "success",
              message: `Successfully loaded ${formattedData.length} valid subscribers`,
            });
          }
        } catch (error) {
          console.error("Error processing file:", error);
          setSubmissionStatus({
            type: "error",
            message: error.message || "Failed to process Excel file",
          });
        } finally {
          setFileUploading(false);
        }
      }
    },
  });

  const handleBulkUpload = async () => {
    if (!excelData.length) return;

    setIsSubmitting(true);
    setSubmissionStatus({
      type: "info",
      message: `Processing ${excelData.length} subscribers...`,
    });

    try {
      // Step 1: Add renewal date to each subscriber
      const subscribersWithRenewal = excelData.map((subscriber) => {
        const renewalDate = calculateRenewalDate(
          subscriber.activationDate,
          subscriber.ispInfo.numberOfMonths
        );

        return {
          ...subscriber,
          ispInfo: {
            ...subscriber.ispInfo,
            renewalDate,
          },
        };
      });

      // Step 2: Process in batches
      const batchSize = 5;
      const results = [];
      let successful = 0;
      let failed = 0;

      for (let i = 0; i < subscribersWithRenewal.length; i += batchSize) {
        const batch = subscribersWithRenewal.slice(i, i + batchSize);

        setSubmissionStatus((prev) => ({
          ...prev,
          progress: Math.floor((i / subscribersWithRenewal.length) * 100),
          message: `Processing ${i + 1}-${Math.min(
            i + batchSize,
            subscribersWithRenewal.length
          )} of ${subscribersWithRenewal.length}...`,
        }));

        // Send to server
        const response = await createBulkSubscriberMutate({
          subscribers: batch,
        });

        const { createdSubscribers, validationErrors } = response.data;

        // Process success
        createdSubscribers.forEach((sub) => {
          successful++;
          results.push({
            index: null, // Optional: backend didn’t return index here
            status: "success",
            data: sub,
          });
        });

        // Process failures
        validationErrors.forEach((err) => {
          failed++;
          const originalIndex = i + err.index;
          results.push({
            index: originalIndex,
            status: "error",
            error: err.error || "Unknown error",
            data: subscribersWithRenewal[originalIndex],
          });
        });
      }

      // Step 3: Prepare final status
      const errorDetails = results
        .filter((r) => r.status === "error")
        .map(
          (r) =>
            `Row ${r.index + 1}: ${r.data.siteName} (${r.data.siteCode}) - ${
              r.error
            }`
        );

      setSubmissionStatus({
        type: failed > 0 ? (successful > 0 ? "warning" : "error") : "success",
        message: `Processed ${excelData.length} subscribers: ${successful} succeeded, ${failed} failed`,
      });

      const exportErrors = (rows) => {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Errors");

        /* this triggers an automatic download in the browser */
        XLSX.writeFile(wb, "BulkUploadErrors.xlsx", { compression: true });
      };

      // Step 4: Reset or retain data
      if (failed === 0) {
        setExcelData([]);
        handleClose();
      } else {
        // setExcelData(
        //   results.filter((r) => r.status === "error").map((r) => r.data)
        // );
        const errorRows = results
          .filter((r) => r.status === "error")
          .map((r, idx) => ({
            "Row No.": r.index + 1,
            "Site Name": r.data.siteName,
            "Site Code": r.data.siteCode,
            Error: r.error,
          }));

        exportErrors(errorRows);

        // Keep only failed for retry
        setExcelData(
          results.filter((r) => r.status === "error").map((r) => r.data)
        );
      }
    } catch (error) {
      console.error("Bulk upload error:", error);
      setSubmissionStatus({
        type: "error",
        message: error?.response?.data?.message || "Bulk upload failed",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto hide-scrollbar">
        {submissionStatus && (
          <div className="mb-4">
            <Toast
              type={submissionStatus.type}
              message={submissionStatus.message}
              onClose={() => setSubmissionStatus(null)}
            />
            {submissionStatus.details && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm">
                <h4 className="font-medium text-red-800 mb-1">
                  Error Details:
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {submissionStatus.details.map((detail, i) => (
                    <li key={i} className="text-red-700">
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="font-medium text-yellow-800 mb-1">
              Validation Errors ({validationErrors.length}):
            </h4>
            <div className="max-h-40 overflow-y-auto">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {validationErrors.slice(0, 10).map((error, i) => (
                  <li key={i} className="text-yellow-700">
                    {error}
                  </li>
                ))}
                {validationErrors.length > 10 && (
                  <li className="text-yellow-700">
                    ...and {validationErrors.length - 10} more errors
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Bulk Subscriber Registration (Excel)
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

        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-blue-200 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">Instructions:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
              <li>Upload an Excel file with subscriber data</li>
              <li>Date format: DD-MM-YYYY</li>
              <li>Maximum file size: 5MB</li>
              <li>
                Download{" "}
                <a
                  href="/templates/subscribers-template.xlsx"
                  download
                  className="underline font-bold"
                >
                  template file
                </a>
              </li>
            </ul>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className="border-2 border-dashed border-blue-400 bg-blue-50/40 hover:bg-blue-100 transition-all duration-300 ease-in-out rounded-2xl p-8 text-center cursor-pointer shadow-sm hover:shadow-md"
          >
            <input {...getInputProps()} />
            {fileUploading ? (
              <div className="space-y-2">
                <p className="text-blue-700 font-medium animate-pulse">
                  Processing file...
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full animate-pulse w-3/4"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-blue-700 font-semibold">
                  📄 Drag & drop an <span className="underline">Excel</span>{" "}
                  file here
                </p>
                <p className="text-sm text-blue-600">or</p>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse Files
                </button>
                <p className="text-xs text-blue-500 mt-2">
                  Supported formats: .xls, .xlsx (Max 5MB)
                </p>
              </div>
            )}
          </div>

          {/* Upload Summary and Button */}
          {excelData.length > 0 && validationErrors.length === 0 && (
            <div className="mt-4 bg-white border border-gray-200 rounded-xl p-6 shadow-md">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-gray-700 font-medium">
                    <span className="font-semibold text-green-600">
                      {excelData.length}
                    </span>{" "}
                    subscribers ready for import
                  </p>
                  <p className="text-sm text-gray-500">
                    Review the data before uploading
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExcelData([])}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto mb-4 border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Site
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Address
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Plan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {excelData.slice(0, 5).map((sub, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {sub.siteName} ({sub.siteCode})
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {sub.siteAddress}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {sub.ispInfo.broadbandPlan}
                        </td>
                      </tr>
                    ))}
                    {excelData.length > 5 && (
                      <tr>
                        <td
                          colSpan="3"
                          className="px-3 py-2 text-sm text-center text-gray-500"
                        >
                          ...and {excelData.length - 5} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={handleBulkUpload}
                disabled={isSubmitting}
                className={`w-full px-6 py-3 rounded-lg text-white font-semibold transition-colors duration-300 ${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                    Uploading...
                  </span>
                ) : (
                  "🚀 Upload All Subscribers"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddSubscribersExcel;
