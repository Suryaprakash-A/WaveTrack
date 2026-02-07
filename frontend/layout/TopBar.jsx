import React, { useState } from "react";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoSettingsOutline } from "react-icons/io5";
import { IoSyncOutline } from "react-icons/io5";
import { SlUser } from "react-icons/sl";
import { inActivateExpiredSubscriberAPI } from "../services/automateServices";
import Toast from "../components/Toast";
import { Link, useLocation } from "react-router-dom";

const TopBar = ({ onToggleSidebar, pageTitle }) => {
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [isInActivating, setIsInActivating] = useState(false);

  return (
    <div className="flex h-16 items-center justify-between p-4 shadow-md">
      {submissionStatus && (
        <Toast
          type={submissionStatus.type}
          message={submissionStatus.message}
          onClose={() => setSubmissionStatus(null)}
        />
      )}
      <div className="flex items-center space-x-4">
        <GiHamburgerMenu
          size={25}
          className="text-black cursor-pointer"
          onClick={onToggleSidebar}
        />
        <h1 className="text-black text-lg font-semibold">{pageTitle}</h1>
      </div>
      <div className="flex items-center">
        <IoSyncOutline
          size={25}
          className={`text-black m-2 cursor-pointer ${
            isInActivating ? "animate-spin" : ""
          }`}
          onClick={async () => {
            setIsInActivating(true);
            await inActivateExpiredSubscriberAPI()
              .then((response) => {
                // Show success message
                setSubmissionStatus({
                  type: "success",
                  message:
                    response?.message ??
                    "Expired subscribers inactivated successfully.",
                });
              })
              .catch((error) => {
                console.error("", error); // Show error message
                setSubmissionStatus({
                  type: "error",
                  message:
                    error?.response?.data?.error ??
                    error?.message ??
                    "Failed to inactivate expired subscribers",
                });
              })
              .finally(() => {
                setIsInActivating(false);
                // Reload the page to refresh data
                setTimeout(() => {
                  window.location.reload();
                }, 3000);
              });
          }}
        />
        <Link to="/my-profile">
          <SlUser size={22} className="text-black ml-2 mr-4 cursor-pointer" />
        </Link>
      </div>
    </div>
  );
};

export default TopBar;
