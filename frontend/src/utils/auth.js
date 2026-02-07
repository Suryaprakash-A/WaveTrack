export const hasPermission = (requiredRoles, userRoles) => {
  try {
    // Check if user has at least one required role
    const hasPermission = userRoles.some((role) =>
      requiredRoles.includes(role)
    );
    return hasPermission;
  } catch {
    return null;
  }
};
