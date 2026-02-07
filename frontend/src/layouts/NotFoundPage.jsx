import React from "react";
import { ArrowLeft } from "lucide-react"; // optional, for back icon
import { useNavigate } from "react-router-dom"; // if using React Router
import birdImg from "../assets/bird-img.png"; // adjust path as needed

const NotFoundPage = () => {
  const navigate = useNavigate(); // if using React Router

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-white text-center px-4">
      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 tracking-wide">
        OOPS...DON'T WORRY.
      </h1>
      <p className="text-gray-600 mb-6">
        The page you're looking for isn't available. Please return to Home page.
      </p>
      <button
        onClick={() => navigate(-1)} // goes back to previous page
        className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Go back
      </button>
      <img src={birdImg} alt="Cute Bird" className="w-64 mt-10" />
    </div>
  );
};

export default NotFoundPage;
