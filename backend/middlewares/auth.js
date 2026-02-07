const jwt = require("jsonwebtoken");
const Employee = require("../models/Employee");
const ErrorResponse = require("../utils/errorResponse");

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Not authorized to access this route",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await Employee.findById(decoded.id);
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Not authorized to access this route",
    });
  }
};

// exports.authorize = (...roles) => {
//   return (req, res, next) => {
//     console.error(`User roles: ${req.user.roles}, Required roles: ${roles}`);

//     if (!roles.includes(req.user.roles)) {
//       return next(
//         new ErrorResponse(
//           `User role ${req.user.role} is not authorized to access this route`,
//           403
//         )
//       );
//     }
//     next();
//   };
// };

exports.authorize = (...requiredRoles) => {
  return (req, res, next) => {
    if (!req.user?.roles) {
      return next(new ErrorResponse("User roles not found", 403));
    }

    // Check if user has at least one required role
    const hasPermission = req.user.roles.some((role) =>
      requiredRoles.includes(role)
    );

    if (!hasPermission) {
      return next(
        new ErrorResponse(
          "You are not authorized, Authorized for Seniors:",
          403
        )
      );
    }

    next();
  };
};
