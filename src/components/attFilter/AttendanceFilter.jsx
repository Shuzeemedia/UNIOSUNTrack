import React from "react";
import "./attendanceFilter.css";
import { FaCalendarAlt } from "react-icons/fa";

const AttendanceFilter = ({ filter, setFilter, date, setDate }) => {
  return (
    <div className="attendance-filter-container">
      <div className="filter-buttons">
        <button
          className={`filter-btn ${filter === "today" ? "active" : ""}`}
          onClick={() => setFilter("today")}
        >
          Today
        </button>

        <button
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
      </div>

      <div className="date-picker">
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setFilter("date"); // custom date
          }}
        />
      </div>
    </div>
  );
};


export default AttendanceFilter;