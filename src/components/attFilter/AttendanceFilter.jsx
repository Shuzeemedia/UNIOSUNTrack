import React from "react";
import "./attendanceFilter.css";
import { FaCalendarAlt } from "react-icons/fa";

const AttendanceFilter = ({ filter, setFilter, date, setDate }) => {
  const filters = [
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "All", value: "all" },
  ];

  return (
    <div className="attendance-filter-container">
      <div className="filter-buttons">
        {filters.map((f) => (
          <button
            key={f.value}
            className={`filter-btn ${filter === f.value ? "active" : ""}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="date-picker">
        <FaCalendarAlt className="calendar-icon" />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
    </div>
  );
};

export default AttendanceFilter;
