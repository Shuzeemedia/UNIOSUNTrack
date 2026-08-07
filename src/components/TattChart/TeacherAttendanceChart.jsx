import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import "./teacherAttendanceChart.css";

const TeacherAttendanceChart = ({ data = [] }) => {
  const chartData = data.map((rec) => ({
    name: rec.student?.name || "Unknown",
    Present: rec.present ?? 0,
    Absent: rec.absent ?? 0,
  }));

  // =====================================================
  // Custom Tooltip
  // =====================================================
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    const present =
      payload.find((item) => item.dataKey === "Present")?.value ?? 0;

    const absent =
      payload.find((item) => item.dataKey === "Absent")?.value ?? 0;

    const total = Number(present) + Number(absent);

    return (
      <div className="teacher-chart-tooltip">
        <div className="tooltip-student">
          {label}
        </div>

        <div className="tooltip-row">
          <span className="tooltip-label">
            <span className="tooltip-dot present-dot" />
            Present
          </span>

          <strong>{present}</strong>
        </div>

        <div className="tooltip-row">
          <span className="tooltip-label">
            <span className="tooltip-dot absent-dot" />
            Absent
          </span>

          <strong>{absent}</strong>
        </div>

        <div className="tooltip-divider" />

        <div className="tooltip-total">
          <span>Total Records</span>
          <strong>{total}</strong>
        </div>
      </div>
    );
  };

  return (
    <section className="teacher-chart-card">

      {/* =================================================
          HEADER
      ================================================= */}
      <div className="teacher-chart-header">
        <div>
          <h3 className="chart-title">
            Attendance Overview
          </h3>

          <p className="chart-subtitle">
            Student attendance records for the selected period
          </p>
        </div>

        {chartData.length > 0 && (
          <div className="chart-record-count">
            {chartData.length}{" "}
            {chartData.length === 1 ? "Student" : "Students"}
          </div>
        )}
      </div>

      {/* =================================================
          EMPTY STATE
      ================================================= */}
      {chartData.length === 0 ? (
        <div className="teacher-chart-empty">
          <div className="empty-chart-icon">
            <span />
            <span />
            <span />
          </div>

          <h4>No attendance records</h4>

          <p>
            Attendance data will appear here once students
            begin recording attendance.
          </p>
        </div>
      ) : (
        /* =================================================
           CHART
        ================================================= */
        <div className="teacher-chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 10,
                left: 0,
                bottom: 55,
              }}
              barGap={8}
              barCategoryGap="22%"
            >
              <CartesianGrid
                stroke="#e5e7eb"
                strokeDasharray="4 4"
                vertical={false}
              />

              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={75}
                tick={{
                  fontSize: 11,
                  fill: "#64748b",
                  fontWeight: 500,
                }}
              />

              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                width={35}
                tick={{
                  fontSize: 11,
                  fill: "#64748b",
                  fontWeight: 500,
                }}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  fill: "rgba(11, 102, 35, 0.04)",
                }}
              />

              <Legend
                verticalAlign="top"
                align="right"
                height={45}
                iconType="circle"
                wrapperStyle={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#475569",
                }}
              />

              <Bar
                dataKey="Present"
                name="Present"
                fill="#0B6623"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
                animationDuration={900}
                animationEasing="ease-out"
              />

              <Bar
                dataKey="Absent"
                name="Absent"
                fill="#DC2626"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

    </section>
  );
};

export default TeacherAttendanceChart;