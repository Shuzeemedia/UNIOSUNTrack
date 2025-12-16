import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import { AuthContext } from "../../context/AuthContext";
import { toast } from "react-toastify";

import "./teacherDashboard.css";

const TeacherDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [departments, setDepartments] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeSession, setActiveSession] = useState("");
  const [activeSemester, setActiveSemester] = useState("");

  // ----------- FETCH ACTIVE SESSION & SEMESTER -----------
  useEffect(() => {
    const fetchActiveSettings = async () => {
      try {
        const res = await api.get("/settings/active-session-semester", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setActiveSession(res.data.session || "");
        setActiveSemester(res.data.semester || "");
      } catch (err) {
        console.error("Error fetching active session/semester:", err);
        toast.error("Failed to load active session and semester.");
      }
    };

    fetchActiveSettings();
  }, [user.token]);

  // ----------- FETCH COURSES (ACTIVE SEMESTER ONLY) -----------
  useEffect(() => {
    if (!activeSemester) return;

    const fetchCourses = async () => {
      try {
        setLoading(true);
        const res = await api.get("/courses/my-courses", {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        const safeCourses = (res.data || []).map((c) => ({
          _id: c._id || "",
          name: c.name || "Untitled Course",
          code: c.code || "",
          level: c.level || "",
          unit: c.unit ?? null,
          description: c.description || "",
          semester: typeof c.semester === "object"
            ? c.semester.season || "Unknown"
            : c.semester,
          enrolledCount: c.enrolledCount || 0,
          department: c.department
            ? { _id: c.department._id || "", name: c.department.name || "Unknown Dept" }
            : { _id: "", name: "Unknown Dept" },
        }));

        setCourses(safeCourses);

        // Extract unique departments
        const uniqueDepts = [
          ...new Map(
            safeCourses
              .filter((c) => c.department && c.department._id)
              .map((c) => [c.department._id, c.department])
          ).values(),
        ];
        setDepartments(uniqueDepts);
      } catch (err) {
        console.error("TeacherDashboard Fetch Error:", err?.response?.data || err);
        toast.error(err?.response?.data?.msg || "Error loading courses.");
        setCourses([]);
        setDepartments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [activeSemester, user.token]);

  // ----------- FILTER LEVELS BASED ON DEPARTMENT -----------
  useEffect(() => {
    if (!selectedDepartment) {
      setLevels([]);
      setSelectedLevel("");
      setFilteredCourses(courses);
      return;
    }

    const deptObj = departments.find((d) => d._id === selectedDepartment);
    if (deptObj) {
      setLevels(Array.isArray(deptObj.levels) ? deptObj.levels : []);
      setSelectedLevel("");
    } else {
      setLevels([]);
      setSelectedLevel("");
    }
  }, [selectedDepartment, departments, courses]);

  // ----------- FILTER COURSES ----------- 
  useEffect(() => {
    let filtered = courses;

    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDepartment) {
      filtered = filtered.filter((c) => c.department?._id === selectedDepartment);
    }

    if (selectedLevel) {
      filtered = filtered.filter((c) => c.level === Number(selectedLevel));
    }

    setFilteredCourses(filtered);
  }, [searchTerm, selectedDepartment, selectedLevel, courses]);

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="error-text">{error}</p>;

  return (
    <div className="teacher-dashboard">
      {/* ===== HEADER CARD ===== */}
      <div className="teacher-header-card d-flex justify-content-between flex-wrap">
        <div className="teacher-info-left">
          <h1>Welcome, {user?.name || "Teacher"}</h1>
          <p><strong>Department:</strong> {user?.department?.name || "Not assigned"}</p>
          <p><strong>Email:</strong> {user?.email}</p>
        </div>
        <div className="teacher-info-right">
          <p><strong>Current Session:</strong> {activeSession || "Loading..."}</p>
          <p><strong>Active Semester:</strong> {activeSemester || "Loading..."}</p>
        </div>
      </div>

      {/* ===== FILTERS SECTION ===== */}
      <section className="filters-section d-flex flex-wrap justify-content-between align-items-center mb-3 gap-3">
        {/* Department Selector */}
        {departments.length > 0 && (
          <div className="department-filter d-flex align-items-center gap-2">
            <label htmlFor="deptSelect"><strong>Department:</strong></label>
            <select
              id="deptSelect"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="form-select"
            >
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Level Selector */}
        {Array.isArray(levels) && levels.length > 0 && (
          <div className="level-filter d-flex align-items-center gap-2">
            <label htmlFor="levelSelect"><strong>Level:</strong></label>
            <select
              id="levelSelect"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="form-select"
            >
              <option value="">All</option>
              {levels.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>
        )}

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search course by name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-control search-input w-auto"
          style={{ minWidth: "250px", maxWidth: "350px" }}
        />
      </section>

      {/* ===== COURSES SECTION ===== */}
      <section className="courses-section">
        {filteredCourses.length === 0 ? (
          <div className="empty-state">
            <p>{error || "No matching courses found."}</p>
          </div>
        ) : (
          <div className="courses-grid">
            {filteredCourses.map((course) => (
              <div
                key={course._id}
                className="course-card"
                onClick={() => navigate(`/teacher/courses/${course._id}`)}
              >
                <h3>{course.name}</h3>
                {course.code && <span className="code-tag">{course.code}</span>}
                <p className="desc">{course.description || "No description available"}</p>
                <div className="meta">
                  <p><strong>Course Unit:</strong> {course.unit ?? "N/A"}</p>
                  <p><strong>Enrolled Students:</strong> {course.enrolledCount ?? 0}</p>
                  <p><strong>Level:</strong> {course.level || "N/A"}</p>
                  <p><strong>Semester:</strong> {course.semester || "N/A"}</p>
                  <p><strong>Department:</strong> {course.department?.name || "N/A"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default TeacherDashboard;