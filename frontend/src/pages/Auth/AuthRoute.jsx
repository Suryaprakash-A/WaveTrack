// import { getUserFromStorage } from "../../utils/getUserFromStorage";
// import { Navigate } from "react-router-dom";

// import React from "react";

// const AuthRoute = ({ children }) => {
//   const token = getUserFromStorage();

//   if (token) {
//     return children;
//   } else {
//     return <Navigate to="/login" />;
//   }
// };

// export default AuthRoute;

// components/ProtectedRoute.jsx
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const AuthRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state?.auth);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default AuthRoute;
