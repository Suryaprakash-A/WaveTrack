// hooks/useAutoLogout.js
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { logout } from "../redux/store/authSlice";
import { isTokenExpired } from "../utils/jwt";
import { jwtDecode } from "jwt-decode";

const useAutoLogout = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token || isTokenExpired(token)) {
      dispatch(logout());
      localStorage.removeItem("jwt");
      return;
    }

    // Calculate remaining time until expiration
    const { exp } = jwtDecode(token);
    const expiresIn = exp * 1000 - Date.now();

    const timer = setTimeout(() => {
      dispatch(logout());
      localStorage.removeItem("jwt");
      window.location.href = "#/login?expired=true";
    }, expiresIn);

    return () => clearTimeout(timer);
  }, [dispatch]);
};

export default useAutoLogout;
