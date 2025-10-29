import React from "react";
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import "./studentAttendanceChart.css"; //we'll add styles next

const StudentAttendanceChart = ({ summary }) => {
  const attendance = Number(summary?.percentage || 0);

  const data = [
    {
      name: "Attendance",
      value: attendance,
      fill:
        attendance >= 75
          ? "#0B6623" // Uniosun Green
          : attendance >= 50
          ? "#FBBF24" // Gold for warning
          : "#e74c3c", // Red for low attendance
    },
  ];

  return (
    <div className="attendance-chart">
      <ResponsiveContainer width="100%" height={250}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="100%"
          barSize={15}
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
            background={{ fill: "#f0f0f0" }}
            cornerRadius={12}
            dataKey="value"
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </RadialBarChart>
      </ResponsiveContainer>

      <div className="chart-center">
        <h3 className="attendance-value">
          {attendance.toFixed(1)}%
        </h3>
        <p className="attendance-label">Attendance</p>
      </div>
    </div>
  );
};

export default StudentAttendanceChart;
