import React, { useRef, useEffect, useState } from "react";

const UserHoverCard = ({ userData }) => {
  const [position, setPosition] = useState("top"); // 'top' or 'bottom'
  const hoverRef = useRef(null);

  useEffect(() => {
    const checkPosition = () => {
      if (!hoverRef.current) return;

      const rect = hoverRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      // Choose position based on space
      if (spaceAbove < 160 && spaceBelow > spaceAbove) {
        setPosition("bottom");
      } else {
        setPosition("top");
      }
    };

    checkPosition();
    window.addEventListener("resize", checkPosition);
    return () => window.removeEventListener("resize", checkPosition);
  }, []);

  if (!userData?.modifiedBy) return null;

  return (
    <div
      ref={hoverRef}
      className={`absolute z-50 left-0 ${
        position === "top" ? "bottom-full mb-2" : "top-full mt-2"
      } w-56 bg-white shadow-xl rounded-lg border-1 border-gray-500 p-2.5`}
    >
      <div className="space-y-1.5">
        {/* Header with name */}
        <div className="font-semibold text-gray-800 text-sm truncate">
          {userData.modifiedBy.name}
        </div>

        {/* Compact details grid */}
        <div className="grid grid-cols-12 gap-y-1 text-xs">
          <div className="col-span-4 text-gray-500">ID:</div>
          <div className="col-span-8 font-medium truncate">
            {userData.modifiedBy.employee_id || "—"}
          </div>

          <div className="col-span-4 text-gray-500">Email:</div>
          <div className="col-span-8 truncate">
            <p className="text-blue-600 hover:underline">
              {userData.modifiedBy.email}
            </p>
          </div>

          <div className="col-span-4 text-gray-500">Contact:</div>
          <div className="col-span-8 truncate">
            {userData.modifiedBy.contact ? (
              <p className="text-gray-700 hover:underline">
                {userData.modifiedBy.contact}
              </p>
            ) : (
              "—"
            )}
          </div>
        </div>

        {/* Roles */}
        <div className="pt-1">
          <div className="text-xs text-gray-500 mb-0.5">Roles:</div>
          <div className="flex flex-wrap gap-1">
            {userData.modifiedBy.roles?.length > 0 ? (
              userData.modifiedBy.roles.map((role, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 text-[11px] px-2 py-0.5 rounded-full"
                >
                  {role}
                </span>
              ))
            ) : (
              <span className="text-gray-400 text-xs">No roles</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserHoverCard;
