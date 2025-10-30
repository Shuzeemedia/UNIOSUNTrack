import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import "./adminLayout.css";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role?.toLowerCase() !== "admin") {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) return null;

  const getInitials = (name) => {
    if (!name) return "A";
    const parts = name.split(" ");
    return parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const navItems = [
    { path: "/admin/dashboard", label: "Dashboard" },
    { path: "/admin/leaderboard", label: "Leaderboard" },
    { path: "/admin/users", label: "Users" },
    { path: "/admin/courses", label: "Courses" },
    { path: "/admin/attendance", label: "Attendance" },
    { path: "/admin/teachers", label: "Lecturers" },
    { path: "/admin/departments", label: "Departments" },
  ];

  return (
    <div className="admin-layout">
      {/* ===== Sidebar ===== */}
      <aside className={`admin-sidebar ${sidebarOpen ? "active" : ""}`}>
        <div className="admin-logo" onClick={() => navigate("/admin/dashboard")}>
          Admin Panel
        </div>

        <nav className="admin-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`admin-link ${
                    location.pathname === item.path ? "active" : ""
                  }`}
                  onClick={() => setSidebarOpen(false)} // close on mobile after click
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* ===== Main Section ===== */}
      <div className="admin-main">
        <header className="admin-header">
          {/* HAMBURGER BUTTON */}
          <button
            className="burger-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span className="burger-line"></span>
            <span className="burger-line"></span>
            <span className="burger-line"></span>
          </button>

          <img
            src="/ranks/uniosunlogo.png"
            alt="Uniosun Logo"
            className="login-logo"
          />

          <div className="admin-profile">
            <div className="admin-avatar" onClick={() => setOpen(!open)}>
              {user?.profileImage ? (
                <img src={user.profileImage} alt="profile" />
              ) : (
                getInitials(user?.name)
              )}
            </div>

            {open && (
              <div className="admin-dropdown">
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/profile");
                  }}
                >
                  Account Settings
                </button>
                <button
                  className="text-danger"
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>

      {/* Overlay for small screens */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
};

export default AdminLayout;
