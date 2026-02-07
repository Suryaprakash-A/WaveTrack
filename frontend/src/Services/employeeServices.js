import { getAuthHeaders } from "../utils/authHeaders";
import { BASE_URL } from "../utils/url";
import axios from "axios";

export const createEmployeeAPI = async (employeeData) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/employees`,
      employeeData,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error creating employee:", error);
    throw error;
  }
};

export const getEmployeesAPI = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/employees`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error("Error fetching employees:", error);
    throw error;
  }
};

export const getEmployeeByIdAPI = async (id) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/employees/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching employee:", error);
    throw error;
  }
};

export const approveEmployeeAPI = async (id, status, employee) => {
  try {
    let payload;

    if (status === "OnProcess") {
      payload = {
        request_status: "approved",
        status: "Active",
      };
    } else if (status === "Modified") {
      payload = {
        name: employee?.modifiedData?.current?.name,
        email: employee?.modifiedData?.current?.email,
        contact: employee?.modifiedData?.current?.contact,
        roles: employee?.modifiedData?.current?.roles,
        request_status: "approved",
        status: "Active",
      };
    } else if (status === "InActive") {
      payload = {
        request_status: "approved",
        status: "InActive",
      };
    } else if (status === "Active") {
      payload = {
        request_status: "approved",
        status: "Active",
      };
    }

    const response = await axios.patch(
      `${BASE_URL}/employees/${id}/approve`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error approving employee:", error);
    throw error;
  }
};

export const rejectEmployeeAPI = async (id, status, employee) => {
  try {
    let payload;

    if (status === "OnProcess") {
      payload = {
        request_status: "rejected",
        status: "Rejected",
      };
    } else if (status === "Modified") {
      payload = {
        request_status: "rejected",
        status: "Rejected",
      };
    } else if (status === "InActive") {
      payload = {
        request_status: "approved",
        status: "Active",
      };
    } else if (status === "Active") {
      payload = {
        request_status: "approved",
        status: "InActive",
      };
    }

    const response = await axios.patch(
      `${BASE_URL}/employees/${id}/reject`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error rejecting employee:", error);
    throw error;
  }
};

export const updateEmployeeAPI = async ({ id, data }) => {
  try {
    const response = await axios.patch(
      `${BASE_URL}/employees/${id}`,
      data,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error updating employee:", error);
    throw error;
  }
};

export const inActivateEmployeeAPI = async (id, status) => {
  try {
    let payload;
    if (status === "Active") {
      payload = {
        request_status: "pending",
        status: "InActive",
      };
    } else if (status === "InActive") {
      payload = {
        request_status: "pending",
        status: "Active",
      };
    }

    const response = await axios.patch(
      `${BASE_URL}/employees/${id}/inActivate`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error updating employee:", error);
    throw error;
  }
};

export const resetPasswordAPI = async (id) => {
  try {
    const response = await axios.patch(
      `${BASE_URL}/employees/${id}/resetPassword`,
      {},
      getAuthHeaders()
    );

    return response.data;
  } catch (error) {
    console.error("Error updating employee:", error);
    throw error;
  }
};

export const deleteEmployeeAPI = async (id) => {
  try {
    const response = await axios.delete(
      `${BASE_URL}/employees/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting employee:", error);
    throw error;
  }
};
