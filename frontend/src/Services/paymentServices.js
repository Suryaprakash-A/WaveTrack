import { getAuthHeaders } from "../utils/authHeaders";
import { BASE_URL } from "../utils/url";
import axios from "axios";

export const createPaymentAPI = async (paymentData) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/payments`,
      paymentData,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error creating payment:", error);
    throw error;
  }
};

export const getPaymentsAPI = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/payments`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error("Error fetching payments:", error);
    throw error;
  }
};

export const getPaymentByIdAPI = async (paymentId) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/payments/id/${paymentId}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching payment:", error);
    throw error;
  }
};

export const getPaymentsBySubscriberIdAPI = async (subId) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/payments/${subId}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching payments:", error);
    throw error;
  }
};

export const updatePaymentAPI = async ({ id, data }) => {
  try {
    const response = await axios.patch(
      `${BASE_URL}/payments/${id}`,
      data,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error updating payment:", error);
    throw error;
  }
};

export const approvePaymentAPI = async (id, status, payment) => {
  try {
    let payload;

    if (status === "Paid") {
      payload = {
        request_status: "approved",
      };
    } else if (status === "Modified") {
      payload = {
        transactionMode: payment?.modifiedData?.current?.transactionMode,
        amount: payment?.modifiedData?.current?.amount,
        activationDate: payment?.modifiedData?.current?.activationDate,
        expiryDate: payment?.modifiedData?.current?.expiryDate,
        request_status: "approved",
        status: "Received",
      };
    } else if (status === "Received") {
      payload = {
        request_status: "approved",
      };
    } else if (status === "Active") {
      payload = {
        request_status: "approved",
        status: "Active",
      };
    } else if (status === "Refunding") {
      payload = {
        request_status: "approved",
        status: "Refunded",
      };
    }

    const response = await axios.patch(
      `${BASE_URL}/payments/${id}/approve`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error approving payment:", error);
    throw error;
  }
};

export const rejectPaymentAPI = async (id, status, payment) => {
  try {
    let payload;

    if (status === "Paid" || status === "Received") {
      payload = {
        request_status: "rejected",
        status: "Rejected",
      };
    } else if (status === "Modified") {
      payload = {
        request_status: "rejected",
        status: "Rejected",
      };
    } else if (
      status === "Refunding" &&
      payment?.transactionType === "Expense"
    ) {
      payload = {
        request_status: "approved",
        status: "Paid",
      };
    }

    const response = await axios.patch(
      `${BASE_URL}/payments/${id}/reject`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error rejecting payment:", error);
    throw error;
  }
};

export const refundPaymentAPI = async (id, status) => {
  try {
    let payload;
    if (status === "Rejected") {
      payload = {
        request_status: "pending",
        status: "Refunding",
      };
    } else if (status === "Paid") {
      payload = {
        request_status: "pending",
        status: "Refunding",
      };
    } else if (status === "Received") {
      payload = {
        request_status: "pending",
        status: "Refunding",
      };
    }

    const response = await axios.patch(
      `${BASE_URL}/payments/${id}/refund`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error updating payment:", error);
    throw error;
  }
};
