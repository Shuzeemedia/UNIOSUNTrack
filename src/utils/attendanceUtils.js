// src/utils/attendanceUtils.js

// Global attendance threshold
export const ATTENDANCE_THRESHOLD = 75;

// Build query params for filters
export const getFilterParams = (filter, date) => {
    const today = new Date().toISOString().split("T")[0];
  
    switch (filter) {
      case "today":
        return { filter: "today" };
  
      case "date":
        return { filter: "date", date };
  
      case "all":
      default:
        return { filter: "all" };
    }
  };
  


// For student side: compute summary
export const computeSummary = (records) => {
    if (!records || records.length === 0) {
        return { total: 0, present: 0, absent: 0, percentage: 0 };
    }

    const total = records.length;
    const present = records.filter((r) => r.status === "Present").length;
    const absent = total - present;

    // Ensure numeric percentage (and handle division by zero safely)
    const percentage = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;

    return { total, present, absent, percentage };
};