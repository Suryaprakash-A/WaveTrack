import { getAuthHeaders } from "../utils/authHeaders";
import { BASE_URL } from "../utils/url";
import axios from "axios";

export const createSubscriberAPI = async (subscriberData) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/subscribers`,
      subscriberData,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error creating Subscriber:", error);
    throw error;
  }
};

export const createBulkSubscribersAPI = async (subscribersData) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/subscribers/bulk`,
      subscribersData,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error creating Bulk Subscribers:", error);
    throw error;
  }
};

export const getSubscribersAPI = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/subscribers`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    throw error;
  }
};

export const approveSubscriberAPI = async (id, status, subscriber) => {
  try {
    let payload;

    if (status === "Added") {
      payload = {
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
    } else if (status === "Modified") {
      payload = {
        customerName: subscriber?.modifiedData?.current?.customerName,
        siteName: subscriber?.modifiedData?.current?.siteName,
        siteCode: subscriber?.modifiedData?.current?.siteCode,
        siteAddress: subscriber?.modifiedData?.current?.siteAddress,
        localContact: {
          name: subscriber?.modifiedData?.current?.localContact?.name,
          contact: subscriber?.modifiedData?.current?.localContact?.contact,
        },
        ispInfo: {
          name: subscriber?.modifiedData?.current?.ispInfo?.name,
          contact: subscriber?.modifiedData?.current?.ispInfo?.contact,
          broadbandPlan:
            subscriber?.modifiedData?.current?.ispInfo?.broadbandPlan,
          numberOfMonths:
            subscriber?.modifiedData?.current?.ispInfo?.numberOfMonths,
          otc: subscriber?.modifiedData?.current?.ispInfo?.otc,
          mrc: subscriber?.modifiedData?.current?.ispInfo?.mrc,
        },
        credentials: {
          username: subscriber?.modifiedData?.current?.credentials?.username,
          password: subscriber?.modifiedData?.current?.credentials?.password,
          circuitId: subscriber?.modifiedData?.current?.credentials?.circuitId,
          accountId: subscriber?.modifiedData?.current?.credentials?.accountId,
        },
        request_status: "approved",
        status: "Active",
      };
    } else if (status === "Suspended") {
      payload = {
        request_status: "approved",
        status: "Suspended",
      };
    }

    console.log(payload);

    const response = await axios.patch(
      `${BASE_URL}/subscribers/${id}/approve`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error :", error);
    throw error;
  }
};

export const rejectSubscriberAPI = async (id, status, subscriber) => {
  try {
    let payload;

    if (status === "Added") {
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
    } else if (status === "Suspended") {
      payload = {
        request_status: "approved",
        status: "Active",
      };
    } else if (status === "Active") {
      payload = {
        request_status: "approved",
        status: "Suspended",
      };
    }

    const response = await axios.patch(
      `${BASE_URL}/subscribers/${id}/reject`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error rejecting subscriber:", error);
    throw error;
  }
};

export const bulkApproveSubscriberAPI = async (subscribersToApprove) => {
  try {
    const response = await axios.patch(
      `${BASE_URL}/subscribers/bulk-approve`,
      subscribersToApprove,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error Approving Bulk Subscribers:", error);
    throw error;
  }
};

export const bulkRejectSubscriberAPI = async (subscribersToReject) => {
  try {
    const response = await axios.patch(
      `${BASE_URL}/subscribers/bulk-reject`,
      subscribersToReject,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error Rejecting Bulk Subscribers:", error);
    throw error;
  }
};

export const bulkDeleteSubscriberAPI = async (subscribersToDelete) => {
  try {
    const response = await axios.patch(
      `${BASE_URL}/subscribers/bulk-delete`,
      subscribersToDelete,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error Deleting Bulk Subscribers:", error);
    throw error;
  }
};

export const getSubscriberByIdAPI = async (id) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/subscribers/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching subscriber:", error);
    throw error;
  }
};

export const updateSubscriberAPI = async ({ id, data }) => {
  try {
    const response = await axios.patch(
      `${BASE_URL}/subscribers/${id}`,
      data,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error updating subscriber:", error);
    throw error;
  }
};

export const suspendSubscriberAPI = async (id, status) => {
  try {
    let payload;
    if (status === "Active") {
      payload = {
        request_status: "pending",
        status: "Suspended",
      };
    } else if (status === "InActive") {
      payload = {
        request_status: "pending",
        status: "Suspended",
      };
    } else if (status === "Suspended") {
      payload = {
        request_status: "pending",
        status: "Active",
      };
    }

    const response = await axios.patch(
      `${BASE_URL}/subscribers/${id}/suspend`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error updating subscriber:", error);
    throw error;
  }
};

export const deleteSubscriberAPI = async (id) => {
  try {
    const response = await axios.delete(
      `${BASE_URL}/subscribers/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting subscriber:", error);
    throw error;
  }
};
