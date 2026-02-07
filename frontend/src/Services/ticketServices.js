import { getAuthHeaders } from "../utils/authHeaders";
import { BASE_URL } from "../utils/url";
import axios from "axios";

export const createTicketAPI = async (ticketData) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/tickets`,
      ticketData,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error creating ticket:", error);
    throw error;
  }
};

export const getTicketsAPI = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/tickets`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error("Error fetching tickets:", error);
    throw error;
  }
};

export const getTicketByIdAPI = async (id) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/tickets/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching ticket:", error);
    throw error;
  }
};

export const approveTicketAPI = async (id, status, ticket) => {
  try {
    let payload;

    if (status === "Open") {
      payload = {
        request_status: "approved",
        status: "Open",
      };
    } else if (status === "Resolved") {
      payload = {
        request_status: "approved",
        status: "Resolved",
      };
    }

    const response = await axios.patch(
      `${BASE_URL}/tickets/${id}/approve`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error :", error);
    throw error;
  }
};

export const rejectTicketAPI = async (id, status, subscriber) => {
  try {
    let payload;

    if (status === "Open") {
      payload = {
        request_status: "rejected",
        status: "Canceled",
      };
    } else if (status === "Resolved") {
      payload = {
        request_status: "approved",
        status: "In Progress",
      };
    }

    const response = await axios.patch(
      `${BASE_URL}/tickets/${id}/reject`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error rejecting ticket:", error);
    throw error;
  }
};

export const updateTicketAPI = async ({ id, data }) => {
  try {
    const response = await axios.patch(
      `${BASE_URL}/tickets/${id}`,
      data,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error updating ticket:", error);
    throw error;
  }
};

export const resolveTicketAPI = async (id, status, note) => {
  try {
    let payload;
    if (status === "In Progress" || status === "Critical") {
      payload = {
        note: note,
        request_status: "pending",
        status: "Resolved",
      };
    }

    const response = await axios.patch(
      `${BASE_URL}/tickets/${id}/resolved`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error updating ticket:", error);
    throw error;
  }
};
