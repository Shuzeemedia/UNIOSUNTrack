import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/api";
import StudentCourseCard from "../../components/studcoursecard/StudentCourseCard";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import { Container, Row, Col, Form } from "react-bootstrap";
import "./studentDashboard.css";

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user?.role === "student") {
      fetchCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/courses/my-courses/student");
      const courseData = res.data || [];
      setCourses(courseData);

      const summaries = {};
      for (let course of courseData) {
        try {
          const attRes = await api.get(`/attendance/my-summary/${course._id}`);
          summaries[course._id] = attRes.data.summary;
        } catch {
          summaries[course._id] = { total: 0, present: 0, absent: 0, percentage: 0 };
        }
      }
      setAttendanceSummary(summaries);
    } catch (err) {
      if (err.isOffline) {
        setError("⚠️ You are offline. Cannot fetch courses.");
      } else {
        setError("Failed to fetch courses.");
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <Container fluid className="student-dashboard py-4">
      {/* Inline error messages */}
      {error && <p className="text-danger">{error}</p>}

      {/* DASHBOARD HEADER */}
      <div className="dashboard-header mb-4">
        <h2 className="fw-bold text-dark mb-1">Welcome, {user?.name}</h2>
        <div className="user-info d-flex align-items-center gap-2 mt-2">
          <span className="text-muted fw-semibold">
            <i className="bi bi-building text-success me-1"></i>
            {user?.department?.name || "No Department"}
          </span>
          <span className="vr mx-2"></span>
          <span className="text-muted fw-semibold">
            <i className="bi bi-mortarboard text-success me-1"></i>
            {user?.level ? `${user.level} Level` : "N/A"}
          </span>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <h5 className="fw-semibold text-success mb-2">Your Courses</h5>
        <Form.Control
          type="text"
          placeholder="Search courses by name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-bar"
          disabled={!!error && error.includes("offline")}
        />
      </div>

      <Row className="g-4">
        {filteredCourses.length === 0 ? (
          <p className="text-muted">
            {error && error.includes("offline")
              ? "Cannot display courses while offline."
              : "No matching courses found."}
          </p>
        ) : (
          filteredCourses.map((course) => (
            <Col key={course._id} xs={12} sm={6} lg={4}>
              <StudentCourseCard
                course={course}
                summary={attendanceSummary[course._id]}
              />
            </Col>
          ))
        )}
      </Row>
    </Container>
  );
};

export default StudentDashboard;
