import React, { useEffect, useState } from "react";
import { LayoutDashboard, LogOut } from "lucide-react";
import { GoOrganization } from "react-icons/go";
import { FaUsers } from "react-icons/fa";
import { AiOutlineAlert } from "react-icons/ai";
import { IoTicketSharp } from "react-icons/io5";
import { SiPivotaltracker } from "react-icons/si";
import { HiDocumentCurrencyRupee } from "react-icons/hi2";
import { MdInventory, MdOutlineAdminPanelSettings } from "react-icons/md";
import { Podcast } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Sidebar, { SidebarItem, DropdownItem } from "./Sidebar";
import { logoutAPI } from "../services/authServices";
import { getUserRoles } from "../utils/jwt";
import { hasPermission } from "../utils/auth";
import { getEmployeesAPI } from "../services/employeeServices";
import { getSubscribersAPI } from "../services/subscriberServices";
import { getPaymentsAPI } from "../services/paymentServices";
import { getTicketsAPI } from "../services/ticketServices";

const EmployeeSidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const userRoles = getUserRoles();

  //HR and Higher Authority
  const HRPermission = hasPermission(
    ["Admin", "General Manager", "Manager", "Senior HR", "HR"],
    userRoles
  );

  //Finance and Higher Authority
  const FinancePermission = hasPermission(
    ["Admin", "General Manager", "Manager", "Finance"],
    userRoles
  );

  //Technical Team and Higher Authority
  const TLStaffPermission = hasPermission(
    ["Admin", "General Manager", "Manager", "Team Lead", "Staff"],
    userRoles
  );

  const location = useLocation();
  const path = location.pathname;

  const [isSubscriberOpen, setIsSubscriberOpen] = useState(false);

  const toggleSubscriberDropdown = () => {
    setIsSubscriberOpen(!isSubscriberOpen);
  };

  const logoutHandler = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logoutAPI();
    }
  };

  const [employees, setEmployees] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [employees, subscribers, payments, tickets] = await Promise.all([
          getEmployeesAPI(),
          getSubscribersAPI(),
          getPaymentsAPI(),
          getTicketsAPI(),
        ]);

        setEmployees(employees?.data);
        setSubscribers(subscribers?.data);
        setPayments(payments?.data);
        setTickets(tickets?.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [path]);

  const [employeeNotifications, setEmployeeNotifications] = useState([]);
  const [subscriberNotifications, setSubscriberNotifications] = useState([]);
  const [paymentNotifications, setPaymentNotifications] = useState([]);
  const [trackerNotifications, setTrackerNotifications] = useState([]);
  const [ticketNotifications, setTicketNotifications] = useState([]);

  // Count active filters and notifications
  useEffect(() => {
    const calculateNotifications = () => {
      // Employee notifications
      const pendingAndRejectedEmployees = employees.filter(
        (e) => e.request_status === "pending" || e.request_status === "rejected"
      ).length;

      // Subscriber notifications
      const pendingAndRejectedSubscribers = subscribers.filter(
        (e) => e.request_status === "pending" || e.request_status === "rejected"
      ).length;

      // Payment notifications
      const pendingPayments = payments.filter(
        (e) => e.request_status === "pending"
      ).length;

      // Ticket notifications
      const pendingTickets = tickets.filter(
        (e) => e.status !== "Resolved" && e.status !== "Canceled"
      ).length;

      // Renewal tracker notifications
      const upcomingDays = 7;
      let renewalNotifications = 0;

      if (upcomingDays !== undefined) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + upcomingDays);

        renewalNotifications = subscribers.filter((subscriber) => {
          if (
            !subscriber?.ispInfo?.renewalDate ||
            subscriber.status === "Suspended"
          ) {
            return false;
          }

          const renewalDate = new Date(subscriber.ispInfo.renewalDate);
          renewalDate.setHours(0, 0, 0, 0);
          return renewalDate <= futureDate;
        }).length;
      }

      // Update states
      setEmployeeNotifications(pendingAndRejectedEmployees);
      setSubscriberNotifications(pendingAndRejectedSubscribers);
      setPaymentNotifications(pendingPayments);
      setTrackerNotifications(renewalNotifications);
      setTicketNotifications(pendingTickets);
    };

    calculateNotifications();
  }, [employees, subscribers, payments, tickets]);

  return (
    <>
      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`
          fixed top-0 left-0 h-full w-64 bg-white shadow-md z-40
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:relative
        `}
      >
        <Sidebar>
          <Link to="/">
            <SidebarItem
              icon={<LayoutDashboard size={30} />}
              text="Dashboard"
              onClick={() => setSidebarOpen(false)}
              active={path === "/"}
            />
          </Link>

          {FinancePermission && (
            <Link to="/subscriber-management" className="relative">
              <SidebarItem
                icon={<Podcast size={30} />}
                text="Subscribers"
                // onClick={toggleSubscriberDropdown}
                onClick={() => setSidebarOpen(false)}
                isDropdown
                isOpen={isSubscriberOpen}
                active={
                  path === "/subscriber-management" ||
                  path.startsWith("/subscriber/")
                }
              />
              {subscriberNotifications > 0 && (
                <span className="absolute bottom-3 -right-2 bg-gray-100 border-1 border-red-500 text-red-600 text-sm font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                  {subscriberNotifications}
                </span>
              )}
            </Link>
          )}

          {HRPermission && (
            <Link to="/employee-management" className="relative">
              <SidebarItem
                icon={<FaUsers size={30} />}
                text="User Management"
                active={
                  path === "/employee-management" ||
                  path.startsWith("/employee-management/")
                }
                onClick={() => setSidebarOpen(false)}
              />
              {employeeNotifications > 0 && (
                <span className="absolute bottom-3 -right-2 bg-gray-100 border-1 border-red-500 text-red-600 text-sm font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                  {employeeNotifications}
                </span>
              )}
            </Link>
          )}

          {FinancePermission && (
            <Link to="/subscription-tracker" className="relative">
              <SidebarItem
                icon={<SiPivotaltracker size={30} />}
                text="Subscription Tracker"
                active={
                  path === "/subscription-tracker" ||
                  path.startsWith("/subscription-tracker")
                }
                onClick={() => setSidebarOpen(false)}
              />
              {trackerNotifications > 0 && (
                <span className="absolute bottom-3 -right-2 bg-gray-100 border-1 border-red-500 text-red-600 text-sm font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                  {trackerNotifications}
                </span>
              )}
            </Link>
          )}

          {FinancePermission && (
            <Link to="/all-payments" className="relative">
              <SidebarItem
                icon={<HiDocumentCurrencyRupee size={30} />}
                text="Payment Records"
                active={
                  path === "/all-payments" || path.startsWith("/all-payments")
                }
                onClick={() => setSidebarOpen(false)}
              />
              {paymentNotifications > 0 && (
                <span className="absolute bottom-3 -right-2 bg-gray-100 border-1 border-red-500 text-red-600 text-sm font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                  {paymentNotifications}
                </span>
              )}
            </Link>
          )}

          {TLStaffPermission && (
            <Link to="/tickets" className="relative">
              <SidebarItem
                icon={<IoTicketSharp size={30} />}
                text="Tickets"
                active={path === "/tickets" || path.startsWith("/tickets")}
                onClick={() => setSidebarOpen(false)}
              />
              {ticketNotifications > 0 && (
                <span className="absolute bottom-3 -right-2 bg-gray-100 border-1 border-red-500 text-red-600 text-sm font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                  {ticketNotifications}
                </span>
              )}
            </Link>
          )}

          <hr className="my-3" />

          <SidebarItem
            icon={<LogOut size={30} />}
            text="Logout"
            onClick={logoutHandler}
          />
        </Sidebar>
      </div>
    </>
  );
};

export default EmployeeSidebar;
