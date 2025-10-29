import React, { useState, useEffect } from "react";
import API from "../../api/api";
import "./LeaderboardPage.css";
import { toast } from "react-toastify";
import { getRank } from "../../utils/getRank";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";

function LeaderboardPage() {
  const [departments, setDepartments] = useState([]);
  const [levels] = useState(["100", "200", "300", "400"]);
  const [courses, setCourses] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  // Fetch departments (admin/teacher only)
  useEffect(() => {
    if (user.role !== "student") {
      API.get("/departments")
        .then((res) => setDepartments(res.data))
        .catch(() => toast.error("Failed to fetch departments"));
    } else {
      const deptId = user.department?._id || user.department;
      if (deptId && !selectedDept) setSelectedDept(deptId);
      if (user.level && !selectedLevel) setSelectedLevel(user.level);
    }
  }, []);

  // Fetch courses based on dept & level
  useEffect(() => {
    if (selectedDept && selectedLevel) {
      API.get("/courses", {
        params: { department: selectedDept, level: selectedLevel },
      })
        .then((res) => setCourses(res.data))
        .catch(() => toast.error("Failed to fetch courses"));
    }
  }, [selectedDept, selectedLevel]);

  const fetchLeaderboard = async () => {
    if (!selectedCourse) {
      toast.error("Please select a course first");
      return;
    }

    try {
      setLoading(true);
      const { data } = await API.get("/leaderboard", {
        params: {
          department: user.role === "student" ? undefined : selectedDept || undefined,
          level: user.role === "student" ? undefined : selectedLevel || undefined,
          courseId: selectedCourse || undefined,
        },
      });
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch leaderboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <LoadingSpinner />;


  return (
    <div className="leaderboard-wrapper">
      <h2 className="leaderboard-title">🏆 Attendance Leaderboard</h2>

      {/* Filters */}
      <div className="filter-section">
        {user.role !== "student" && (
          <>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="filter-select"
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>

            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="filter-select"
            >
              <option value="">Select Level</option>
              {levels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl} Level
                </option>
              ))}
            </select>
          </>
        )}

        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="filter-select"
        >
          <option value="">Select Course</option>
          {courses.map((course) => (
            <option key={course._id} value={course._id}>
              {course.name}
            </option>
          ))}
        </select>

        <button
          className="load-btn"
          onClick={fetchLeaderboard}
          disabled={loading || !selectedCourse}
        >
          {loading ? "Loading..." : "Load Leaderboard"}
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? ( // show spinner while loading
          <LoadingSpinner />
        ) : leaderboard.length === 0 ? (
          <p className="no-data">No data available</p>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student Name</th>
                <th>Matric No</th>
                <th>XP Score</th>
                <th>Rank</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((student, index) => {
                const present = student.totalPresent || 0;
                const totalClasses = student.totalClasses || 0;
                const ratio = totalClasses > 0 ? (present / totalClasses).toFixed(2) : "0.00";
                const rank = getRank(present, totalClasses);

                return (
                  <tr key={student.studentId || index} className={`rank-${index + 1}`}>
                    <td>{index + 1}</td>
                    <td>{student.name || "N/A"}</td>
                    <td>{student.studentId || student.matric || "N/A"}</td>
                    <td>{ratio} XP</td>
                    <td>
                      <img src={rank.img} alt={rank.name} className="rank-icon" /> {rank.name}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default LeaderboardPage;
