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

  // Fetch courses (teacher/admin/student)
  useEffect(() => {
    if (!user) return;

    const fetchCourses = async () => {
      try {
        let data;
        if (user.role === "teacher") {
          data = await API.get("/courses/my-courses").then((res) => res.data);
          if (!Array.isArray(data) || data.length === 0) {
            setAccessBlocked(true);
            toast.warning("You are not assigned to any course yet. Leaderboard disabled.");
            return;
          }
        } else if (user.role === "admin") {
          data = await API.get("/courses/admin-filter").then((res) => res.data.courses || []);
          if (!Array.isArray(data) || data.length === 0) {
            setAccessBlocked(true);
            toast.warning("No courses found. Leaderboard disabled.");
            return;
          }
        } else if (user.role === "student") {
          data = await API.get("/courses/enrolled").then((res) => res.data || []);
          if (!Array.isArray(data) || data.length === 0) {
            setAccessBlocked(true);
            toast.warning("You are not enrolled in any course yet. Leaderboard disabled.");
            return;
          }
          setSelectedDept(user.department?._id || "");
          setSelectedLevel(user.level || "");
        }

        setCourses(data);

        // Build unique departments from courses
        const uniqueDepts = [
          ...new Map(
            data
              .filter((c) => c.department && c.department._id)
              .map((c) => [c.department._id, c.department])
          ).values(),
        ];
        setDepartments(uniqueDepts);

        // Preselect if only one department
        if (uniqueDepts.length === 1) {
          setSelectedDept(uniqueDepts[0]._id);
          const deptLevels = [...new Set(data.filter((c) => c.department._id === uniqueDepts[0]._id).map((c) => c.level))];
          setLevels(deptLevels);
          if (deptLevels.length === 1) setSelectedLevel(deptLevels[0]);
        }
      } catch (err) {
        console.error(err);
        setAccessBlocked(true);
        toast.error("Failed to fetch courses for leaderboard.");
      }
    };

    fetchCourses();
  }, [user]);

  // Update levels when department changes
  useEffect(() => {
    if ((user.role === "teacher" || user.role === "admin") && selectedDept) {
      const deptLevels = [...new Set(courses.filter((c) => c.department._id === selectedDept).map((c) => c.level))];
      setLevels(deptLevels);
      if (!deptLevels.includes(selectedLevel)) {
        setSelectedLevel("");
        setSelectedCourse("");
      }
    }
  }, [selectedDept, courses, selectedLevel, user?.role]);

  // Filter courses for select dropdown
  const filteredCourses = courses.filter((c) => {
    if (user.role === "student") return true;
    if (selectedDept && c.department._id !== selectedDept) return false;
    if (selectedLevel && c.level !== selectedLevel) return false;
    return true;
  });

  // Fetch leaderboard
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

  const rankImages = {
    Bronze: "/ranks/bronze.png",
    Silver: "/ranks/silver.png",
    Gold: "/ranks/gold.png",
    Platinum: "/ranks/plat.png",
    Diamond: "/ranks/diamond.png",
    Champion: "/ranks/champ.png",
    "Grand Champion": "/ranks/Gchamp.png",
    "Star Student League": "/ranks/super.png",
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
                  if (b.ratio !== a.ratio) return b.ratio - a.ratio;
                  return a.name.localeCompare(b.name);
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


      <p className="ranking-description">
        The leaderboard rewards students based on their **attendance performance**. Your XP score is calculated from how consistently you attend classes.
        Higher XP = higher rank.

        <br />
        Ranks progress from <div className="rank-legend">
          {[
            "Bronze",
            "Silver",
            "Gold",
            "Platinum",
            "Diamond",
            "Champion",
            "Grand Champion",
            "Star Student League",
          ].map((r) => (
            <div key={r} className="rank-legend-item">
              <img src={rankImages[r]} alt={r} className="rank-icon-small" />
              <span>{r}</span>
            </div>
          ))}
        </div>
        .
        Only the most consistent students reach the top tiers.
      </p>

      <div className="rank-hype">
        <p>⭐ <strong>Top 10</strong> students are celebrated school-wide.</p>
        <p>🔥 <strong>Top 3</strong> students earn legendary status — respect guaranteed.</p>
        <p>🏆 <strong>Star Student League</strong> is reserved for excellence. Few ever reach it.</p>
      </div>
    </div>
  );
}

export default LeaderboardPage;
