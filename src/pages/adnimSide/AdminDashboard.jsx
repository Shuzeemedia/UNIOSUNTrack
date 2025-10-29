import { useEffect, useState } from "react";
import api from "../../api/api";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import "./adminDashboard.css"; 

ChartJS.register(CategoryScale, LinearScale, ArcElement, BarElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get("/admin/dashboard-stats");
        setStats(res.data);
      } catch (err) {
        console.error("Error fetching dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!stats) return <p className="error-text">Failed to load dashboard</p>;

  const { totals, studentsByDepartment, studentsByLevel, recentUsers, recentAttendance } = stats;

  return (
    <div className="admin-dashboard">
      <header className="admin-headerX">
        <h2>Welcome, Admin</h2>
        <p>Manage Lecturers, students, courses, and attendance efficiently.</p>
      </header>

      {/* Stats Section */}
      <section className="stats-grid">
        <StatCard title="Students" value={totals.students} />
        <StatCard title="Lecturers" value={totals.teachers} />
        <StatCard title="Courses" value={totals.courses} />
        <StatCard title="Attendance Records" value={totals.attendanceRecords} />
      </section>

      {/* Charts Section */}
      <section className="charts-section">
        <ChartCard title="Students by Department">
          <Pie
            data={{
              labels: studentsByDepartment.map((d) => d.department || "Unknown"),
              datasets: [
                {
                  data: studentsByDepartment.map((d) => d.count),
                  backgroundColor: [
                    "#0B6623",
                    "#FBBF24",
                    "#3B82F6",
                    "#E11D48",
                    "#9333EA",
                  ],
                  hoverOffset: 8,
                },
              ],
            }}
            options={{ responsive: true, plugins: { legend: { position: "bottom" } } }}
          />
        </ChartCard>

        <ChartCard title="Students by Level">
          <Bar
            data={{
              labels: studentsByLevel.map((d) => `Level ${d.level || "N/A"}`),
              datasets: [
                {
                  label: "Students",
                  data: studentsByLevel.map((d) => d.count),
                  backgroundColor: "#0B6623",
                  borderRadius: 8,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
            }}
          />
        </ChartCard>
      </section>

      {/* Recent Users */}
      <DataTable
        title="Recent Users"
        columns={["Name", "Email", "Role", "Department", "Level"]}
        rows={recentUsers.map((u) => [
          u.name,
          u.email,
          <RoleBadge key={u._id} role={u.role === "teacher" ? "Lecturer" : u.role} />,
          u.department?.name || "Unknown",
          u.level || "N/A",
        ])}
      />

      {/* Recent Attendance */}
      <DataTable
        title="Recent Attendance"
        columns={["Student", "Course", "Status", "Date"]}
        rows={recentAttendance.map((r, idx) => [
          r.student?.name || "N/A",
          r.course?.name || "N/A",
          <StatusBadge key={idx} status={r.status} />,
          new Date(r.date).toLocaleDateString(),
        ])}
      />
    </div>
  );
};

// Subcomponents
const StatCard = ({ title, value }) => (
  <div className="stat-card">
    <h4>{title}</h4>
    <p>{value}</p>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="chart-card">
    <h3>{title}</h3>
    {children}
  </div>
);

const DataTable = ({ title, columns, rows }) => (
  <div className="data-table">
    <h3>{title}</h3>
    <table>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx}>
            {row.map((cell, i) => (
              <td key={i}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const RoleBadge = ({ role }) => (
  <span className={`role-badge ${role}`}>{role}</span>
);

const StatusBadge = ({ status }) => (
  <span className={`status-badge ${status.toLowerCase()}`}>{status}</span>
);

export default AdminDashboard;
