import React from "react";
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

import "./studentAttendanceChart.css";

const StudentAttendanceChart = ({ summary }) => {
  const attendance = Math.min(
    100,
    Math.max(0, Number(summary?.percentage || 0))
  );

  // =====================================================
  // Attendance status
  // =====================================================
  const getAttendanceStatus = (value) => {
    if (value >= 75) {
      return {
        label: "Good Standing",
        className: "attendance-good",
        color: "#0B6623",
        description: "Your attendance is within the required range.",
      };
    }

    if (value >= 50) {
      return {
        label: "Needs Attention",
        className: "attendance-warning",
        color: "#D99A00",
        description: "Try to attend more classes to improve your record.",
      };
    }

    return {
      label: "Low Attendance",
      className: "attendance-danger",
      color: "#DC2626",
      description: "Your attendance is currently below the recommended range.",
    };
  };

  const status = getAttendanceStatus(attendance);

  const data = [
    {
      name: "Attendance",
      value: attendance,
      fill: status.color,
    },
  ];

  return (
    <section className="student-attendance-chart">

      {/* =================================================
          HEADER
      ================================================= */}
      <div className="student-attendance-header">
        <div>
          <h3>Attendance Rate</h3>
          <p>Your overall attendance performance</p>
        </div>

        {/* <span className={`attendance-status ${status.className}`}>
          {status.label}
        </span> */}
      </div>

      {/* =================================================
          CHART
      ================================================= */}
      <div className="attendance-chart-container">
        <ResponsiveContainer width="100%" height={270}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="72%"
            outerRadius="92%"
            barSize={18}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              tick={false}
            />

            <RadialBar
              background={{
                fill: "#E9EEF0",
              }}
              cornerRadius={12}
              dataKey="value"
              isAnimationActive
              animationBegin={100}
              animationDuration={1200}
              animationEasing="ease-out"
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* =================================================
            CENTER VALUE
        ================================================= */}
        <div className="attendance-chart-center">
          <span className="attendance-chart-value">
            {attendance.toFixed(1)}%
          </span>

          <span className="attendance-chart-label">
            Overall
          </span>
        </div>
      </div>

      {/* =================================================
          FOOTER
      ================================================= */}
      <div className={`attendance-chart-footer ${status.className}`}>
        <div className="attendance-progress-line">
          <span
            style={{
              width: `${attendance}%`,
              backgroundColor: status.color,
            }}
          />
        </div>

        <p>
          {status.description}
        </p>
      </div>

    </section>
  );
};

export default StudentAttendanceChart;