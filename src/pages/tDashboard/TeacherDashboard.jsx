import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api"; // ✅ offline-aware Axios
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import { AuthContext } from "../../context/AuthContext";
import "./teacherDashboard.css";

const TeacherDashboard = () => {
  const { user } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); // ✅ inline error
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/courses/my-courses");
        const fetchedCourses = res.data || [];
        setCourses(fetchedCourses);
        setFilteredCourses(fetchedCourses);
      } catch (err) {
        if (err.isOffline) {
          setError("You are offline. Cannot load courses.");
        } else {
          setError(err.response?.data?.msg || "Failed to load courses");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // 🔍 Filter courses based on search input
  useEffect(() => {
    const filtered = courses.filter(
      (course) =>
        course.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCourses(filtered);
  }, [searchTerm, courses]);

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="error-text">{error}</p>;

  return (
    <div className="teacher-dashboard">
      {/* ===== HEADER CARD ===== */}
      <div className="teacher-header-card">
        <div className="teacher-info">
          <h1>Welcome, {user?.name || "Teacher"}</h1>
          <p>
            <strong>Department:</strong> {user?.department?.name || "Not assigned"}
          </p>
          <p>
            <strong>Email:</strong> {user?.email}
          </p>
        </div>
      </div>

      {/* ===== COURSES SECTION ===== */}
      <section className="courses-section">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
          <h2 className="m-0">My Courses</h2>

          {/* 🔍 Search Bar */}
          <input
            type="text"
            placeholder="Search course by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control search-input w-auto"
            style={{ minWidth: "250px", maxWidth: "350px" }}
          />
        </div>

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

                <p className="desc">
                  {course.description || "No description available"}
                </p>

                <div className="meta">
                  <p>
                    <strong>Course Unit:</strong> {course.unit ?? "N/A"}
                  </p>
                  <p>
                    <strong>Enrolled Students:</strong> {course.enrolledCount ?? 0}
                  </p>
                  <p>
                    <strong>Level:</strong> {course.level || "N/A"}
                  </p>
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
