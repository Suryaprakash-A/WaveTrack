import React, { useState } from "react";
import { getUserInfo } from "../../utils/jwt";
import { MdPassword } from "react-icons/md";
import ChangePasswordForm from "./ChangePasswordForm";

const MyProfile = () => {
  const user = getUserInfo();

  const [showChangePassword, setShowChangePassword] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {showChangePassword && (
          <ChangePasswordForm
            id={user.id}
            handleClose={() => setShowChangePassword(false)}
          />
        )}
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-20"></div>
          <div className="px-6 pb-6 pt-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div className="flex items-center -mt-12">
                <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 shadow-lg flex items-center justify-center mr-4 border-4 border-white">
                  <span className="text-3xl text-indigo-600 font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{user.name}</h1>
                  <div className="flex items-center mt-1 space-x-2">
                    <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      {user.employee_id}
                    </span>
                  </div>
                </div>
              </div>
              <button
                className="mt-4 sm:mt-0 px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-lg shadow hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center text-sm cursor-pointer"
                onClick={() => setShowChangePassword(true)}
              >
                <MdPassword className="h-4 w-4 mr-1" />
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 text-indigo-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-gray-900 font-medium mt-1">{user.email}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Contact</p>
                <p className="text-gray-900 font-medium mt-1">{user.contact}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Roles Information */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 text-indigo-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Roles
          </h2>
          <div className="flex flex-wrap gap-2">
            {user.roles.map((role, index) => (
              <span
                key={index}
                className={`px-3 py-1 text-sm font-medium rounded-full ${
                  role === "Admin" || role === "General Manager"
                    ? "bg-purple-100 text-purple-800"
                    : role === "Manager" || role === "Senior HR"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-indigo-100 text-indigo-800"
                }`}
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
