import React from "react";
import { useEffect } from "react";

const Toast = ({ type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Hide after 3 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "success" ? "bg-green-600" : "bg-red-600";

  return (
    <div
      className={`fixed top-5 md:top-20 left-1/2 transform -translate-x-1/2 z-[9999] px-4 py-2 w-fit rounded-md text-white shadow-lg ${bgColor} flex items-center justify-center min-w-[200px] max-w-screen-sm whitespace-nowrap`}
    >
      {message}
    </div>
  );
};

export default Toast;
