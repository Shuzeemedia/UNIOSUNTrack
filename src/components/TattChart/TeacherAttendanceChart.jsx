// src/components/TeacherAttendanceChart.jsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import "./teacherAttendanceChart.css";

const TeacherAttendanceChart = ({ data = [] }) => {
  const chartData = data.map((rec) => ({
    name: rec.student?.name || "Unknown",
    Present: rec.present ?? 0,
    Absent: rec.absent ?? 0,
  }));


  const colors = {
    Present: "#4CAF50",
    Absent: "#F44336",
  };

  // Custom tooltip with better visuals
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="teacher-chart-tooltip">
          <h4>{label}</h4>
          <p style={{ color: "#0B6623" }}>Present: {payload[0]?.value ?? 0}</p>
          <p style={{ color: "red" }}>Absent: {payload[1]?.value ?? 0}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="teacher-chart-card">
      <h3 className="chart-title">Attendance Overview</h3>

      {chartData.length === 0 ? (
        <p className="empty-text">No attendance records yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 50 }}
            barGap={10}
          >
            <defs>
              <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4CAF50" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#2E7D32" stopOpacity={0.8} />
              </linearGradient>

              <linearGradient id="absentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F44336" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#C62828" stopOpacity={0.8} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
            <XAxis
              dataKey="name"
              angle={-30}
              textAnchor="end"
              height={70}
              tick={{ fontSize: 12, fill: "#555" }}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#555" }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ fontSize: "14px", color: "#444" }}
            />

            <Bar
              dataKey="Present"
              fill="url(#presentGradient)"
              name="Present"
              radius={[6, 6, 0, 0]}
              animationDuration={800}
            >
              {chartData.map((_, idx) => (
                <Cell key={`present-${idx}`} />
              ))}
            </Bar>

            <Bar
              dataKey="Absent"
              fill="url(#absentGradient)"
              name="Absent"
              radius={[6, 6, 0, 0]}
              animationDuration={800}
            >
              {chartData.map((_, idx) => (
                <Cell key={`absent-${idx}`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default TeacherAttendanceChart;