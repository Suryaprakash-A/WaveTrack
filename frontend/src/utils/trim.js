// export const deepTrim = (obj) => {
//   if (typeof obj === "string") return obj.trim();
//   if (Array.isArray(obj)) return obj.map(deepTrim);
//   if (typeof obj === "object" && obj !== null) {
//     const trimmed = {};
//     for (const key in obj) {
//       trimmed[key] = deepTrim(obj[key]);
//     }
//     return trimmed;
//   }
//   return obj;
// };

// utils/trim.js
export const deepTrim = (obj) => {
  if (typeof obj !== "object" || obj === null) {
    return typeof obj === "string" ? obj.trim() : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(deepTrim);
  }

  const result = {};
  for (const key in obj) {
    result[key] = deepTrim(obj[key]);
  }
  return result;
};
