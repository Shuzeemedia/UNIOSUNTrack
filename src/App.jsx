// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Pages
import Signup from "./pages/signup/Signup";
import Login from "./pages/login/Login";
import TeacherDashboard from "./pages/tDashboard/TeacherDashboard";
import TeacherCourseDetails from "./pages/tDashboard/TeacherCourseDetails";
import StudentDashboard from "./pages/Sdashboard/StudentDashboard";
import StudentCourseDetails from "./pages/Sdashboard/StudentCourseDetails";
import CourseDetails from "./pages/CourseDetails";

// Admin
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/adnimSide/AdminDashboard";
import AdminUsers from "./pages/adnimSide/AdminUsers";
import AdminTeachers from "./pages/adnimSide/AdminTeachers";
import AdminCourses from "./pages/adnimSide/AdminCourses";
import AdminManageAttendance from "./pages/adnimSide/AdminManageAttendance";
import AdminDepartments from "./pages/adnimSide/AdminDepartments";

// Layouts
import StudentLayout from "./layouts/studLayout/StudentLayout";
import TeacherLayout from "./layouts/TeacherLayout";

// Components
import ProtectedRoute from "./components/ProtectedRoute";
import Forbidden from "./pages/Forbidden";
import Profile from "./pages/profile/Profile";
import ForgotPassword from "./pages/forgotPass/ForgotPassword";
import ResetPassword from "./pages/resetPass/ResetPassword";

// Leaderboard
import LeaderboardPage from "./pages/Leaderboard/LeaderboardPage";

// New QR Code Pages
import StudentScanPage from "./pages/Sdashboard/StudentScanPage";
import LecturerQRPage from "./pages/tDashboard/LecturerQRPage";

//verify email
import VerifyEmail from "./pages/VerifyEmail";

import StudentCourses from "./pages/Sdashboard/StudentCourses";



// Offline banner

import "./index.css";
import AdminSemesters from "./pages/adnimSide/AdminSemesters";
import AdminSessions from "./pages/adnimSide/AdminSessions";
import FaceEnroll from "./pages/FaceEnroll";

function App() {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <Router>
     

      <ToastContainer position="top-right" autoClose={3000} />

      <Routes>
        {/* ================== PUBLIC ROUTES ================== */}
        <Route path="/" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/enroll-face" element={<FaceEnroll />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/courses/:id" element={<CourseDetails />} />

        {/* ================== TEACHER / LECTURER ================== */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <TeacherLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard/teacher" element={<TeacherDashboard />} />
          <Route path="teacher/courses/:id" element={<TeacherCourseDetails />} />
          <Route path="teacher/profile" element={<Profile />} />
          <Route
            path="teacher/leaderboard"
            element={<LeaderboardPage user={user} />}
          />

          {/* Lecturer QR Code Page */}
          <Route path="teacher/qr/:courseId" element={<LecturerQRPage />} />
        </Route>

        {/* ================== STUDENT ================== */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard/student" element={<StudentDashboard />} />
          <Route path="student/courses" element={<StudentCourses />} />
          <Route path="student/courses/:id" element={<StudentCourseDetails />} />
          <Route path="student/profile" element={<Profile />} />
          <Route
            path="student/leaderboard"
            element={<LeaderboardPage user={user} />}
          />

          {/* Student QR Scan Page */}
          <Route path="student/scan/:sessionToken" element={<StudentScanPage />} />
        </Route>

        {/* ================== ADMIN ================== */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="teachers" element={<AdminTeachers />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="semesters" element={<AdminSemesters />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="attendance" element={<AdminManageAttendance />} />
          <Route path="departments" element={<AdminDepartments />} />
          <Route path="profile" element={<Profile />} />
          <Route
            path="leaderboard"
            element={<LeaderboardPage user={user} />}
          />
        </Route>

        {/* Redirect profile dynamically based on role */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["student", "teacher", "admin"]}>
              {user ? (
                user.role === "teacher" ? (
                  <Navigate to="/teacher/profile" replace />
                ) : user.role === "student" ? (
                  <Navigate to="/student/profile" replace />
                ) : user.role === "admin" ? (
                  <Navigate to="/admin/profile" replace />
                ) : (
                  <Navigate to="/403" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )}
            </ProtectedRoute>
          }
        />

        {/* ================== MISC ================== */}
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/403" element={<Forbidden />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;