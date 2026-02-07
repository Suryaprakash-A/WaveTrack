// utils/jwt.js
import { jwtDecode } from "jwt-decode";

// Check if token is expired
export const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const { exp } = jwtDecode(token);
    return exp * 1000 < Date.now(); // Convert to milliseconds
  } catch {
    return true; // Invalid token
  }
};

// Decode token to get user info
export const decodeToken = (token) => {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
};

export const getUserRoles = () => {
  try {
    const token = localStorage.getItem("jwt"); // or sessionStorage
    const decodedData = jwtDecode(token);
    return decodedData.roles;
  } catch {
    return null;
  }
};

export const getUserInfo = () => {
  try {
    const token = localStorage.getItem("jwt"); // or sessionStorage
    const decodedData = jwtDecode(token);
    return decodedData;
  } catch {
    return null;
  }
};
