import React, { useState, useEffect, useMemo } from "react";
import API from "../../api/api";
import "./LeaderboardPage.css";
import { toast } from "react-toastify";
import { getRank } from "../../utils/getRank";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import { BiCrown } from "react-icons/bi";

import { FaAward } from "react-icons/fa";

import {
  FaUsers,
  FaChartLine,
  FaStar,
  FaTrophy,
  FaMedal,
  FaBullseye
} from "react-icons/fa";



function LeaderboardPage() {
  const [departments, setDepartments] = useState([]);
  const [levels, setLevels] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [visibleTooltip, setVisibleTooltip] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({
    top: 0,
    left: 0,
  });

  const user = JSON.parse(localStorage.getItem("user"));

  // Fetch courses (teacher/admin/student)
  useEffect(() => {
    if (!user) {
      setPageLoading(false);
      return;
    }

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
      } finally {
        setPageLoading(false);
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
      setLoadingLeaderboard(true);
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
      setLoadingLeaderboard(false);
    }
  };

  const stats = useMemo(() => {
    if (!leaderboard.length)
      return {
        students: 0,
        averageXP: 0,
        averageAttendance: 0,
        topStudent: "-"
      };

    const totalXP = leaderboard.reduce(
      (sum, s) =>
        sum +
        ((s.totalPresent || 0) /
          Math.max(s.totalClasses || 1, 1)) *
        10,
      0
    );

    const totalAttendance = leaderboard.reduce(
      (sum, s) =>
        sum +
        ((s.totalPresent || 0) /
          Math.max(s.totalClasses || 1, 1)) *
        100,
      0
    );

    return {
      students: leaderboard.length,
      averageXP: (totalXP / leaderboard.length).toFixed(1),
      averageAttendance: (
        totalAttendance / leaderboard.length
      ).toFixed(0),
      topStudent: leaderboard[0]?.name || "-"
    };
  }, [leaderboard]);

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
  };

  if (pageLoading) return <LoadingSpinner />;

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

      <div className="leaderboard-hero">

        <div className="hero-left">

          <div className="hero-badge">
            <BiCrown />
            Student Ranking System
          </div>

          <h1>
            Attendance <span>Leaderboard</span>
          </h1>

          <p>
            Earn XP through consistent attendance, unlock prestigious ranks,
            and compete with classmates to become the top-performing student.
          </p>

          <div className="hero-tags">

            <span className="hero-tag">
              <FaStar />
              XP Rewards
            </span>

            <span className="hero-tag">
              <FaMedal />
              8 Rank Levels
            </span>

            <span className="hero-tag">
              <FaChartLine />
              Live Ranking
            </span>

            <span className="hero-tag">
              <FaBullseye />
              Attendance Based
            </span>

          </div>

        </div>

        <div className="hero-right">

          <div className="hero-card">

            <BiCrown className="hero-crown" />

            <h2>Become #1</h2>

            <p>
              Attend every class consistently to reach the
              <strong> Star Student League.</strong>
            </p>

          </div>

        </div>

      </div>

      <div className="leaderboard-stats">

        <div className="stat-card">

          <div className="stat-icon">
            <FaUsers />
          </div>

          <span>Total Students</span>

          <h3>{stats.students}</h3>

        </div>

        <div className="stat-card">

          <div className="stat-icon">
            <FaChartLine />
          </div>

          <span>Average Attendance</span>

          <h3>{stats.averageAttendance}%</h3>

        </div>

        <div className="stat-card">

          <div className="stat-icon">
            <FaStar />
          </div>

          <span>Average XP</span>

          <h3>{stats.averageXP}</h3>

        </div>

        <div className="stat-card">

          <div className="stat-icon trophy">
            <FaTrophy />
          </div>

          <span>Top Student</span>

          <h3>{stats.topStudent}</h3>

        </div>

      </div>

      <div className="leaderboard-filter-card">

        <div className="filter-header">
          <div>
            <h3>Filter Leaderboard</h3>
            <p>Select a department, level and course to view rankings.</p>
          </div>
        </div>

        <div className="filter-grid">

          {user.role !== "student" && (
            <>
              <div className="filter-group">
                <label>Department</label>

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
              </div>

              <div className="filter-group">
                <label>Level</label>

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
              </div>
            </>
          )}

          <div className="filter-group">
            <label>Course</label>

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
          </div>

          <div className="filter-btn-wrapper">
            <button
              className="load-btn"
              onClick={fetchLeaderboard}
              disabled={loadingLeaderboard || !selectedCourse}
            >
              {loadingLeaderboard ? "Loading..." : "Load Leaderboard"}
            </button>
          </div>

        </div>

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
              {leaderboard.map((student) => {
                const ratio = (
                  ((student.totalPresent || 0) /
                    (student.totalClasses || 1)) *
                  10
                ).toFixed(2);

                const rank = getRank(
                  student.totalPresent || 0,
                  student.totalClasses || 0
                );

                const deptName = student.department || "N/A";

                return (
                  <tr
                    key={student.studentId}
                    className={`rank-${student.rank}`}
                  >
                    {/* RANK NUMBER */}
                    <td data-label="#">
                      {student.rank}
                    </td>

                    {/* STUDENT NAME */}
                    <td
                      className="student-cell"
                      data-label="Student Name"
                    >
                      <div
                        className={`student-info ${student.rank === 1
                          ? "first-place"
                          : student.rank === 2
                            ? "second-place"
                            : student.rank === 3
                              ? "third-place"
                              : ""
                          }`}
                      >
                        {student.rank === 1 && (
                          <div className="leader-badge gold">
                            <BiCrown />
                          </div>
                        )}

                        {student.rank === 2 && (
                          <div className="leader-badge silver">
                            <FaMedal />
                          </div>
                        )}

                        {student.rank === 3 && (
                          <div className="leader-badge bronze">
                            <FaAward />
                          </div>
                        )}

                        <strong>{student.name}</strong>
                      </div>
                    </td>

                    {/* MATRIC NUMBER */}
                    <td data-label="Matric No">
                      {student.studentId ||
                        student.matric ||
                        "N/A"}
                    </td>

                    {/* DEPARTMENT */}
                    <td data-label="Department">
                      {deptName}
                    </td>

                    {/* LEVEL */}
                    <td data-label="Level">
                      {student.level || "N/A"}
                    </td>

                    {/* XP */}
                    <td data-label="XP Score">
                      <span className="xp-badge">
                        {ratio} XP
                      </span>
                    </td>

                    {/* RANK */}
                    <td className="rank-cell">
                      <div className="rank-icon-wrapper">
                        <img
                          src={rank.img}
                          alt={rank.name}
                          className="rank-icon"
                          onClick={() => showTooltip(student.rank)}
                        />

                        {visibleTooltip === student.rank && (
                          <div className="rank-tooltip">
                            {rank.name}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>


      <div className="leaderboard-info">

        <div className="ranking-card">

          <div className="ranking-card-header">
            <FaChartLine />
            <div>
              <h3>How Ranking Works</h3>
              <p>
                Rankings are generated automatically from your attendance consistency.
                The higher your attendance, the more XP you earn and the higher your league.
              </p>
            </div>
          </div>

          <div className="rank-legend">

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
                <img
                  src={rankImages[r]}
                  alt={r}
                  className="rank-icon-small"
                />

                <span className="rnk_nme">{r}</span>
              </div>
            ))}

          </div>

          <div className="ranking-note">
            <FaStar />
            <span>
              Higher Attendance → More XP → Higher Rank
            </span>
          </div>

        </div>



        <div className="star-card">

          <div className="star-top">

            <img
              src={rankImages["Star Student League"]}
              alt="Star Student League"
              className="star-league-icon"
            />

            <div>

              <h3>Star Student League</h3>

              <span>Highest Achievement</span>

            </div>

          </div>

          <p>
            Reserved for students with exceptional attendance consistency.
            Only the most committed students earn this prestigious title.
          </p>

          <div className="star-footer">
            <FaTrophy />
            Excellence • Discipline • Consistency
          </div>

        </div>

      </div>

    </div>
  );
}

export default LeaderboardPage;