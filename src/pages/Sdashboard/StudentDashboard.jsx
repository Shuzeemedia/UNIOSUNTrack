import { useEffect, useState, useContext, useRef } from "react";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/api";
import StudentCourseCard from "../../components/studcoursecard/StudentCourseCard";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
// import { useLocation } from "react-router-dom";

import "./studentDashboard.css";

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({});
  const [activeSession, setActiveSession] = useState("");
  const [activeSemester, setActiveSemester] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const toastShownRef = useRef(false);



  const fetchCoursesAndSettings = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch courses
      const res = await api.get("/courses/enrolled");
      const courseData = res.data || [];
      setCourses(courseData);

      // Fetch attendance summaries
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

      // Fetch active session & semester
      const settingsRes = await api.get("/settings/active-session-semester");
      setActiveSession(settingsRes.data.session || "");
      setActiveSemester(settingsRes.data.semester || "");
    } catch (err) {
      console.error(err);
      setError("Failed to fetch courses or settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "student") fetchCoursesAndSettings();
  }, [user]);


    
  useEffect(() => {
    if (location.state?.msg && !toastShownRef.current) {
      toastShownRef.current = true;
  
      toast.info(location.state.msg);
  
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, navigate]);
  



  const filteredCourses = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <Container fluid className="student-dashboard py-4">
      {error && <p className="text-danger">{error}</p>}

      {/* HEADER */}
      <div className="dashboard-header mb-4">
        <h2 className="fw-bold text-dark mb-1">Welcome, {user?.name}</h2>
        <div className="user-info d-flex align-items-center gap-3 mt-2 flex-wrap">
          <span className="text-muted fw-semibold">
            <i className="bi bi-building text-success me-1"></i>
            {user?.department?.name || "No Department"}
          </span>
          <span className="vr mx-2"></span>
          <span className="text-muted fw-semibold">
            <i className="bi bi-mortarboard text-success me-1"></i>
            {user?.level ? `${user.level} Level` : "N/A"}
          </span>
          {activeSession && (
            <>
              <span className="vr mx-2"></span>
              <span className="text-muted fw-semibold">
                <i className="bi bi-calendar-event text-success me-1"></i>
                Session: {activeSession}
              </span>
            </>
          )}
          {activeSemester && (
            <>
              <span className="vr mx-2"></span>
              <span className="text-muted fw-semibold">
                <i className="bi bi-book text-success me-1"></i>
                Semester: {activeSemester}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Courses + Search + Enroll Button */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <h5 className="fw-semibold text-success mb-2">Your Courses</h5>
        <Link to="/student/courses">
          <Button variant="success" className="fw-semibold">
            Enroll in Courses
          </Button>
        </Link>
      </div>

      <Form.Control
        type="text"
        placeholder="Search courses by name or code..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-bar mb-3"
      />

      <Row className="g-4">
        {filteredCourses.length === 0 ? (
          <p className="text-muted">No matching courses found.</p>
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
