export const getAuthHeaders = () => {
  const token = localStorage.getItem("jwt"); // or sessionStorage
  if (!token) {
    console.warn("No token found in storage");
    return {}; // Return empty headers if no token
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};
