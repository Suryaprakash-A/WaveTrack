import { getAuthHeaders } from "../utils/authHeaders";
import { BASE_URL } from "../utils/url";
import axios from "axios";

export const inActivateExpiredSubscriberAPI = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/automate`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error("Error inactivating expired subscribers:", error);
    throw error;
  }
};
