import React, { useState, useEffect } from "react";
import API from "../../api/api";
import "./LeaderboardPage.css";
import { toast } from "react-toastify";
import { getRank } from "../../utils/getRank";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";

function LeaderboardPage() {
  const [departments, setDepartments] = useState([]);
  const [levels, setLevels] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [visibleTooltip, setVisibleTooltip] = useState(null);

  const user = JSON.parse(localStorage.getItem("user"));

  // ✅ Fetch departments/courses
  useEffect(() => {
    if (!user) return;

    if (user.role === "teacher" || user.role === "admin") {
      const fetchCourses = async () => {
        try {
          const url = user.role === "teacher" ? "/courses/assigned" : "/courses/admin-filter";
          const { data } = await API.get(url);

          if (!data || !data.courses || data.courses.length === 0) {
            setAccessBlocked(true);
            toast.warning(
              user.role === "teacher"
                ? "You are not assigned to any course yet. Leaderboard disabled."
                : "No courses found. Leaderboard disabled."
            );
            return;
          }

          setCourses(data.courses || []);
          setDepartments(data.departments || []);

          // ✅ Preselect department/level if only one
          const depts = data.departments || [];
          if (depts.length === 1) {
            setSelectedDept(depts[0]._id);
            setLevels(depts[0].levels || []);
            if (depts[0].levels?.length === 1) setSelectedLevel(depts[0].levels[0]);
          }
        } catch (err) {
          // ✅ Handle graceful fallback
          if (err.response && [400, 404].includes(err.response.status)) {
            setAccessBlocked(true);
            toast.warning(
              user.role === "teacher"
                ? "You are not assigned to any course yet. Leaderboard disabled."
                : "No courses found. Leaderboard disabled."
            );
          } else if (err.response && err.response.status === 401) {
            toast.error("Session expired. Please login again.");
            localStorage.removeItem("user");
            window.location.href = "/login";
          } else {
            toast.error("Failed to fetch course data");
          }
        }
      };
      fetchCourses();
    } else if (user.role === "student") {
      const fetchEnrolled = async () => {
        try {
          const { data } = await API.get("/courses/enrolled");

          if (!data || data.length === 0) {
            setAccessBlocked(true);
            toast.warning("You are not enrolled in any course yet. Leaderboard disabled.");
            return;
          }

          setCourses(data);
          setSelectedDept(user.department?._id || "");
          setSelectedLevel(user.level || "");
        } catch (err) {
          if (err.response && [400, 404].includes(err.response.status)) {
            setAccessBlocked(true);
            toast.warning("You are not enrolled in any course yet. Leaderboard disabled.");
          } else if (err.response && err.response.status === 401) {
            toast.error("Session expired. Please login again.");
            localStorage.removeItem("user");
            window.location.href = "/login";
          } else {
            toast.error("Failed to fetch enrolled courses");
          }
        }
      };
      fetchEnrolled();
    }
  }, []);

  // ✅ Update levels when department changes
  useEffect(() => {
    if ((user.role === "teacher" || user.role === "admin") && selectedDept) {
      const dept = departments.find((d) => d._id === selectedDept);
      if (dept) {
        setLevels(dept.levels);
        if (!dept.levels.includes(selectedLevel)) {
          setSelectedLevel("");
          setSelectedCourse("");
        }
      }
    }
  }, [selectedDept, departments, selectedLevel, user.role]);

  // ✅ Filter courses
  const filteredCourses = courses.filter((c) => {
    if (user.role === "student") return true;
    if (selectedDept && c.department._id !== selectedDept) return false;
    if (selectedLevel && c.level !== selectedLevel) return false;
    return true;
  });

  // ✅ Fetch leaderboard
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

  const showTooltip = (index) => {
    setVisibleTooltip(index);
    setTimeout(() => setVisibleTooltip(null), 2000);
  };

  if (loading) return <LoadingSpinner />;

  if (accessBlocked) {
    return (
      <div className="leaderboard-wrapper">
        <h2 className="leaderboard-title">🏆 Attendance Leaderboard</h2>
        <p className="no-data">
          Leaderboard is disabled until you are enrolled or assigned to a course.
        </p>
      </div>
    );
  }

  return (
    <div className="leaderboard-wrapper">
      <h2 className="leaderboard-title">🏆 Attendance Leaderboard</h2>

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
              onChange={(e) => setSelectedLevel(parseInt(e.target.value))}
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
          {filteredCourses.map((course) => (
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

      <div className="table-container">
        {leaderboard.length === 0 ? (
          <p className="no-data">No data available</p>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student Name</th>
                <th>Matric No</th>
                <th>Department</th>
                <th>Level</th>
                <th>XP Score</th>
                <th>Rank</th>
              </tr>
            </thead>
            <tbody>
              {[...leaderboard]
                .map((student) => ({
                  ...student,
                  ratio: ((student.totalPresent || 0) / (student.totalClasses || 1)) * 10,
                }))

                .sort((a, b) => {
                  if (b.ratio !== a.ratio) return b.ratio - a.ratio; // ✅ higher score first
                  return a.name.localeCompare(b.name); // ✅ tie-breaker by name
                })
                .map((student, index) => {
                  const ratio = student.ratio.toFixed(2);
                  const rank = getRank(student.totalPresent || 0, student.totalClasses || 0);
                  const deptName = student.department || "N/A";

                  return (
                    <tr key={student.studentId || index} className={`rank-${index + 1}`}>
                      <td>{index + 1}</td>
                      <td>{student.name || "N/A"}</td>
                      <td>{student.studentId || student.matric || "N/A"}</td>
                      <td>{deptName}</td>
                      <td>{student.level || "N/A"}</td>
                      <td>{ratio} XP</td>
                      <td style={{ position: "relative" }}>
                        <img
                          src={rank.img}
                          alt={rank.name}
                          className="rank-icon"
                          onClick={() => showTooltip(index)}
                        />
                        {visibleTooltip === index && (
                          <div className="rank-tooltip">{rank.name}</div>
                        )}
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
