import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import EmployeeSidebar from "./EmployeeSidebar";
import TopBar from "./TopBar";
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../redux/store/authSlice";
import useAutoLogout from "../hooks/useAutoLogout";
import { decodeToken, isTokenExpired, getUserInfo } from "../utils/jwt";

// Pages
import NotFoundPage from "./NotFoundPage";
import EmployeeManagementPanel from "../pages/EmployeeManagement/EmployeeManagementPanel";
import LoginPage from "../pages/Auth/LoginPage";
import AuthRoute from "../pages/Auth/AuthRoute";
import SubscriberManagementPanel from "../pages/SubscriberManagement/SubscriberManagementPanel";
import MainDashboard from "../pages/Dashboard/MainDashboard";
import Subscriber from "../pages/SubscriberManagement/Subscriber/Subscriber";
import AllPaymentsPanel from "../pages/AllPayments/AllPaymentsPanel";
import SubscriptionTracker from "../pages/SubscriptionTracker/SubscriptionTracker";
import MyProfile from "../pages/MyProfile/MyProfile";
import TicketManagementPanel from "../pages/TicketManagement/TicketManagementPanel";
import CustomerView from "../pages/CustomerPortal/CustomerView"; // Import your new page

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get user info to check roles
  const employee = getUserInfo();
  const isSubscriber = employee?.role === "subscriber";

  // Restore auth state on app load
  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (token && !isTokenExpired(token)) {
      const user = decodeToken(token);
      dispatch(login({ token, user }));
    }
  }, [dispatch]);

  useAutoLogout();

  const noSidebarRoutes = ["/login"];
  const shouldShowSidebar = !noSidebarRoutes.includes(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const paths = [
    { path: "/employee-management", name: "Employee Management" },
    { path: "/", name: "Dashboard" },
    { path: "/subscriber-management", name: "Subscriber Management" },
    { path: "/customer-view", name: "My Subscription" }, // New path name
    { path: "/subscriber", name: "Subscriber" },
    { path: "/all-payments", name: "All Payments" },
    { path: "/subscription-tracker", name: "Subscription Tracker" },
    { path: "/my-profile", name: "My Profile" },
    { path: "/tickets", name: "Tickets" },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {shouldShowSidebar && (
        <EmployeeSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          // The filtering logic happens inside EmployeeSidebar or via Redux
        />
      )}

      <div className="flex-1 flex flex-col overflow-y-auto hide-scrollbar">
        <div className="sticky top-0 z-39 w-full">
          {shouldShowSidebar && (
            <TopBar
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              pageTitle={
                paths.find((p) => p.path === location.pathname.split("/")[1])
                  ?.name ??
                paths.find((p) => p.path === location.pathname)?.name
              }
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar bg-white">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            {/* Standard Dashboard - Usually for Admin/Staff */}
            <Route
              path="/"
              element={
                <AuthRoute>
                  <MainDashboard />
                </AuthRoute>
              }
            />

            {/* New Customer View Route */}
            <Route
              path="/customer-view"
              element={
                <AuthRoute>
                  <CustomerView />
                </AuthRoute>
              }
            />

            <Route
              path="/employee-management"
              element={
                <AuthRoute>
                  <EmployeeManagementPanel />
                </AuthRoute>
              }
            />
            <Route
              path="/subscriber-management"
              element={
                <AuthRoute>
                  <SubscriberManagementPanel />
                </AuthRoute>
              }
            />
            <Route
              path="/subscriber/:id"
              element={
                <AuthRoute>
                  <Subscriber />
                </AuthRoute>
              }
            />
            <Route
              path="/all-payments"
              element={
                <AuthRoute>
                  <AllPaymentsPanel />
                </AuthRoute>
              }
            />
            <Route
              path="/subscription-tracker"
              element={
                <AuthRoute>
                  <SubscriptionTracker />
                </AuthRoute>
              }
            />
            <Route
              path="/my-profile"
              element={
                <AuthRoute>
                  <MyProfile />
                </AuthRoute>
              }
            />
            <Route
              path="/tickets"
              element={
                <AuthRoute>
                  <TicketManagementPanel />
                </AuthRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;