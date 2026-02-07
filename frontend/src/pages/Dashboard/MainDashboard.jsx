import React, { useEffect, useState } from "react";
import { getEmployeesAPI } from "../../services/employeeServices";
import { getSubscribersAPI } from "../../services/subscriberServices";
import { getPaymentsAPI } from "../../services/paymentServices";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

const MainDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState({
    timeRange: "all",
    status: "all",
    role: "all",
    transactionType: "all",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [employees, subscribers, payments] = await Promise.all([
          getEmployeesAPI(),
          getSubscribersAPI(),
          getPaymentsAPI(),
        ]);

        setEmployees(employees?.data);
        setSubscribers(subscribers?.data);
        setPayments(payments?.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Data processing for charts
  const getEmployeeByRoleData = () => {
    const roleCounts = {};

    employees.forEach((emp) => {
      if (Array.isArray(emp.roles)) {
        emp.roles.forEach((role) => {
          roleCounts[role] = (roleCounts[role] || 0) + 1;
        });
      }
    });

    return Object.entries(roleCounts).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const getEmployeeByStatusData = () => {
    const statusCounts = {};
    employees.forEach((emp) => {
      statusCounts[emp.status] = (statusCounts[emp.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const getSubscribersRenewalAmount = () => {
    let renewedCount = 0;
    let renewedAmount = 0;
    let yetToRenewCount = 0;
    let yetToRenewAmount = 0;

    subscribers.forEach((sub) => {
      const currentDate = new Date();
      const expirationDate = new Date(sub.ispInfo.renewalDate);
      const isRenewed = expirationDate > currentDate;
      const mrc = sub?.ispInfo?.mrc || 0;

      if (isRenewed) {
        renewedCount += 1;
        renewedAmount += mrc;
      } else {
        yetToRenewCount += 1;
        yetToRenewAmount += mrc;
      }
    });

    return [
      {
        name: "Renewed",
        count: renewedCount,
        amount: renewedAmount,
      },
      {
        name: "Not Renewed",
        count: yetToRenewCount,
        amount: yetToRenewAmount,
      },
    ];
  };

  const getSubscriberByStatusData = () => {
    const statusCounts = {};
    subscribers.forEach((sub) => {
      statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));
  };

  // Summary cards data
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === "Active").length;
  const inActiveEmployees = employees.filter(
    (e) => e.status === "InActive"
  ).length;
  const onProcessEmployees = employees.filter(
    (e) => e.status === "OnProcess"
  ).length;

  const totalSubscribers = subscribers.length;
  const activeSubscribers = subscribers.filter(
    (s) => s.status === "Active"
  ).length;
  const inActiveSubscribers = subscribers.filter(
    (s) => s.status === "InActive"
  ).length;
  const suspendedSubscribers = subscribers.filter(
    (s) => s.status === "Suspended"
  ).length;

  const totalRevenue = payments
    .filter((p) => p.transactionType === "Income" && p.status !== "Rejected")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = payments
    .filter(
      (p) =>
        p.transactionType === "Expense" &&
        p.status !== "Rejected" &&
        p.status !== "Refunded"
    )
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalOTC = subscribers.reduce(
    (sum, sub) => sum + Number(sub.ispInfo.otc),
    0
  );
  const totalMRC = subscribers.reduce(
    (sum, sub) => sum + Number(sub.ispInfo.mrc),
    0
  );

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50">
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64">
          <div className="flex">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            No Data Available for Visualization
          </h1>
        </div>
      ) : (
        <>
          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`py-2 px-4 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              className={`py-2 px-4 font-medium text-sm ${
                activeTab === "employees"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("employees")}
            >
              Employees
            </button>
            <button
              className={`py-2 px-4 font-medium text-sm ${
                activeTab === "subscribers"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("subscribers")}
            >
              Subscribers
            </button>
            <button
              className={`py-2 px-4 font-medium text-sm ${
                activeTab === "payments"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("payments")}
            >
              Payments
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                  <h3 className="text-gray-500 text-sm font-medium">
                    Total Employees
                  </h3>
                  <p className="text-2xl font-bold text-gray-800">
                    {totalEmployees}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="bg-green-100 px-2 py-1 rounded-full w-fit text-green-800 font-semibold text-sm mt-1">
                      {activeEmployees} Active
                    </span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                  <h3 className="text-gray-500 text-sm font-medium">
                    Total Subscribers
                  </h3>
                  <p className="text-2xl font-bold text-gray-800">
                    {totalSubscribers}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="bg-green-100 px-2 py-1 rounded-full w-fit text-green-800 font-semibold text-sm mt-1">
                      {activeSubscribers} Active
                    </span>
                    <span className="bg-rose-100 px-2 py-1 rounded-full w-fit text-rose-800 font-semibold text-sm mt-1 ">
                      {inActiveSubscribers} Inactive
                    </span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                  <h3 className="text-gray-500 text-sm font-medium">
                    Total Revenue
                  </h3>
                  <p className="text-2xl font-bold text-gray-800">
                    ₹ {totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">All time</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                  <h3 className="text-gray-500 text-sm font-medium">
                    Total Expenses
                  </h3>
                  <p className="text-2xl font-bold text-gray-800">
                    ₹ {totalExpenses.toLocaleString()}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">All time</p>
                </div>
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Employees by Role
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getEmployeeByRoleData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {getEmployeeByRoleData().map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Subscribers Renewal Count and Amount
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getSubscribersRenewalAmount()}
                        layout="vertical" // Makes bars horizontal for better readability
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip
                          formatter={(value, name) => {
                            if (name === "Count") return [value, name];
                            if (name === "Amount")
                              return [`$${value.toFixed(2)}`, name];
                            return value;
                          }}
                        />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" name="Count" />
                        <Bar
                          dataKey="amount"
                          fill="#82ca9d"
                          name="Amount ($)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Employees Tab */}
          {activeTab === "employees" && (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                  <h3 className="text-gray-500 text-sm font-medium">
                    Total Employees
                  </h3>
                  <p className="text-2xl font-bold text-gray-800">
                    {totalEmployees}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                  <h3 className="text-gray-500 text-sm font-medium">
                    Active Employees
                  </h3>
                  <p className="text-2xl font-bold text-gray-800">
                    {activeEmployees}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                  <h3 className="text-gray-500 text-sm font-medium">
                    InActive Employees
                  </h3>
                  <p className="text-2xl font-bold text-gray-800">
                    {inActiveEmployees}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                  <h3 className="text-gray-500 text-sm font-medium">
                    On Process Employees
                  </h3>
                  <p className="text-2xl font-bold text-gray-800">
                    {onProcessEmployees}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Employees by Role
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getEmployeeByRoleData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {getEmployeeByRoleData().map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Employees by Status
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getEmployeeByStatusData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#8884d8" name="Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subscribers Tab */}
          {activeTab === "subscribers" && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                  <h3 className="text-gray-500 text-sm font-medium">
                    Total Subscriber
                  </h3>
                  <p className="text-2xl font-bold text-gray-800">
                    {totalSubscribers}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                  <h3 className="text-gray-500 text-sm font-medium">
                    Active Subscribers
                  </h3>
                  <p className="text-2xl font-bold text-gray-800">
                    {activeSubscribers}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                  <h3 className="text-gray-500 text-sm font-medium">
                    InActive Subscribers
                  </h3>
                  <p className="text-2xl font-bold text-gray-800">
                    {inActiveSubscribers}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                  <h3 className="text-gray-500 text-sm font-medium">
                    Suspended Subscribers
                  </h3>
                  <p className="text-2xl font-bold text-gray-800">
                    {suspendedSubscribers}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Subscribers Renewal Count and Amount
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getSubscribersRenewalAmount()}
                        layout="vertical" // Makes bars horizontal for better readability
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip
                          formatter={(value, name) => {
                            if (name === "Count") return [value, name];
                            if (name === "Amount")
                              return [`$${value.toFixed(2)}`, name];
                            return value;
                          }}
                        />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" name="Count" />
                        <Bar
                          dataKey="amount"
                          fill="#82ca9d"
                          name="Amount ($)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Subscribers by Status
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getSubscriberByStatusData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {getEmployeeByStatusData().map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                  <h3 className="text-gray-500 text-sm font-medium">
                    Total OTC
                  </h3>
                  <p className="text-2xl font-bold text-gray-800">
                    ₹ {totalOTC.toLocaleString()}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                  <h3 className="text-gray-500 text-sm font-medium">
                    Total MRC
                  </h3>
                  <p className="text-2xl font-bold text-gray-800">
                    ₹ {totalMRC.toLocaleString()}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                  <h3 className="text-gray-500 text-sm font-medium">
                    Total Income
                  </h3>
                  <p className="text-2xl font-bold text-gray-800">
                    ₹ {totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">All time</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                  <h3 className="text-gray-500 text-sm font-medium">
                    Total Expense
                  </h3>
                  <p className="text-2xl font-bold text-gray-800">
                    ₹ {totalExpenses.toLocaleString()}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">All time</p>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Income vs Expense Pie Chart */}
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Income vs Expense
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: "Income",
                              value: totalRevenue,
                            },
                            {
                              name: "Expense",
                              value: totalExpenses,
                            },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          <Cell fill="#4CAF50" />
                          <Cell fill="#F44336" />
                        </Pie>
                        <Tooltip
                          formatter={(value) => `₹ ${value.toLocaleString()}`}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Payment Mode Distribution */}
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Payment Methods
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(
                            payments.reduce((acc, payment) => {
                              acc[payment.transactionMode] =
                                (acc[payment.transactionMode] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {Object.entries(
                            payments.reduce((acc, payment) => {
                              acc[payment.transactionMode] =
                                (acc[payment.transactionMode] || 0) + 1;
                              return acc;
                            }, {})
                          ).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MainDashboard;
