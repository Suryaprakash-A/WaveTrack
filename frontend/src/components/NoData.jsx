import React from "react";
import { FiDatabase } from "react-icons/fi";

const NoData = ({
  title = "No Data Available",
  description = "There are no records to display at this time.",
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-gray-100 p-6 rounded-full mb-4 animate-spin">
        <FiDatabase className="text-gray-400 text-6xl" />
      </div>
      <h3 className="text-lg font-medium text-gray-700 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-md mb-6">{description}</p>
    </div>
  );
};

export default NoData;
