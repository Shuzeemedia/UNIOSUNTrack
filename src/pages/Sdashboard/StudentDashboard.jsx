import { useEffect, useState, useContext, useRef } from "react";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/api";
import StudentCourseCard from "../../components/studcoursecard/StudentCourseCard";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  FaGraduationCap,
  FaCheckCircle,
  FaCalendarCheck,
  FaArchive,
  FaFileAlt,
  FaArrowRight,
} from "react-icons/fa";
import { toast } from "react-toastify";

import "./studentDashboard.css";

const StudentDashboard = () => {
  const { user, refreshUser } = useContext(AuthContext);

  const [courses, setCourses] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({});
  const [activeSession, setActiveSession] = useState("");
  const [activeSemester, setActiveSemester] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userReady, setUserReady] = useState(false);

  const hasFetched = useRef(false); // 🔐 prevents loop

  const location = useLocation();
  const navigate = useNavigate();
  const toastShownRef = useRef(false);

  // =====================================================
  // 🔄 Sync user with DB (important after promotion)
  // =====================================================
  useEffect(() => {
    const sync = async () => {
      await refreshUser();
      setUserReady(true);
    };
    sync();
  }, []);

  // =====================================================
  // 📦 Fetch courses + attendance (ONLY if not graduated)
  // =====================================================
  const fetchCoursesAndSettings = async () => {
    try {
      setLoading(true);
      setError("");

      // 🛑 Graduated students should not fetch courses
      if (user?.graduated === true) {
        return;
      }

      const res = await api.get("/courses/enrolled");
      const courseData = res.data || [];

      // 🔥 Detect active session per course
      const coursesWithSessionFlag = await Promise.all(
        courseData.map(async (course) => {
          try {
            const { data } = await api.get(`/sessions/active/${course._id}`, {
              headers: { "x-silent": "true" },
            });

            return {
              ...course,
              hasActiveSession: Boolean(data?.active),
            };
          } catch {
            return {
              ...course,
              hasActiveSession: false,
            };
          }
        })
      );

      setCourses(coursesWithSessionFlag);

      // Fetch attendance summaries
      const summaries = {};
      for (let course of courseData) {
        try {
          const attRes = await api.get(`/attendance/my-summary/${course._id}`);
          summaries[course._id] = attRes.data.summary;
        } catch {
          summaries[course._id] = {
            total: 0,
            present: 0,
            absent: 0,
            percentage: 0,
          };
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

  // =====================================================
  // 🚦 Decide what to load (run ONCE)
  // =====================================================
  useEffect(() => {
    if (!userReady) return;
    if (!user) return;
    if (hasFetched.current) return;

    hasFetched.current = true;

    if (user.graduated === true) {
      setLoading(false);
      return;
    }

    if (user.role === "student") {
      fetchCoursesAndSettings();
    }
  }, [userReady, user]);

  // =====================================================
  // 🔔 Toast message from navigation
  // =====================================================
  useEffect(() => {
    if (location.state?.msg && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.info(location.state.msg);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, navigate]);

  // =====================================================
  // ⏳ Loading
  // =====================================================
  if (!userReady || loading) return <LoadingSpinner />;

  // =====================================================
  // GRADUATED VIEW
  // =====================================================
  if (user?.graduated) {
    return (
      <Container fluid className="graduate-dashboard">
        <div className="graduate-page">

          {/* ==============================================
            GRADUATION HERO
        ============================================== */}
          <section className="graduate-hero">

            <div className="graduate-hero-decoration graduate-decoration-one" />
            <div className="graduate-hero-decoration graduate-decoration-two" />

            <div className="graduate-hero-content">

              <div className="graduate-icon">
                <FaGraduationCap />
              </div>

              <span className="graduate-badge">
                Academic Program Completed
              </span>

              <h1>
                Congratulations, {user.name}
              </h1>

              <p>
                You have successfully completed your academic program.
                Your UNIOSUNTrack academic and attendance records are now
                archived for official reference.
              </p>

            </div>

          </section>

          {/* ==============================================
            GRADUATION INFORMATION
        ============================================== */}
          <section className="graduate-info-grid">

            <div className="graduate-info-card">

              <div className="graduate-info-icon">
                <FaCheckCircle />
              </div>

              <div>
                <span>Program Status</span>
                <strong>Completed</strong>
              </div>

            </div>

            <div className="graduate-info-card">

              <div className="graduate-info-icon">
                <FaCalendarCheck />
              </div>

              <div>
                <span>Graduation Date</span>

                <strong>
                  {user.graduationDate
                    ? new Date(user.graduationDate).toLocaleDateString(
                      "en-NG",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }
                    )
                    : "Not available"}
                </strong>
              </div>

            </div>

            <div className="graduate-info-card">

              <div className="graduate-info-icon">
                <FaArchive />
              </div>

              <div>
                <span>Academic Records</span>
                <strong>Archived</strong>
              </div>

            </div>

          </section>

          {/* ==============================================
            RECORDS SECTION
        ============================================== */}
          <section className="graduate-records-card">

            <div className="graduate-records-content">

              <div className="graduate-records-icon">
                <FaFileAlt />
              </div>

              <div>
                <h3>Your Academic Records</h3>

                <p>
                  Your attendance history and academic records have been
                  securely archived and remain available for official
                  reference.
                </p>
              </div>

            </div>

            <Link to="/student/transcript" className="graduate-transcript-btn">
              <FaFileAlt />
              <span>View Academic Transcript</span>
              <FaArrowRight />
            </Link>

          </section>

          {/* ==============================================
            FOOTER MESSAGE
        ============================================== */}
          <div className="graduate-footer">
            <p>
              Thank you for using <strong>UNIOSUNTrack</strong>.
            </p>
          </div>

        </div>
      </Container>
    );
  }

  // =====================================================
  // 📚 ACTIVE STUDENT VIEW
  // =====================================================
  const filteredCourses = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedCourses = [...filteredCourses].sort(
    (a, b) => Number(b.hasActiveSession) - Number(a.hasActiveSession)
  );


  return (
    <Container fluid className="student-dashboard py-4">
      {!user?.graduated && error && (
        <p className="text-danger">{error}</p>
      )}


      {/* ================= HERO ================= */}

      <div className="student-hero">

        <div className="hero-overlay"></div>

        <div className="hero-content">

          <div className="hero-left">

            <span className="hero-badge">

              Student Dashboard

            </span>

            <h1>

              Welcome back,

              <span>{user?.name}</span>

            </h1>

            <p>

              Access your courses, monitor attendance,
              and stay updated with active class sessions.

            </p>

          </div>

          <div className="hero-rights">

            <div className="hero-info-card">

              <small>Department</small>

              <strong>

                {user?.department?.name || "N/A"}

              </strong>

            </div>

            <div className="hero-info-card">

              <small>Level</small>

              <strong>

                {user?.level || "N/A"} Level

              </strong>

            </div>

            <div className="hero-info-card">

              <small>Session</small>

              <strong>

                {activeSession || "--"}

              </strong>

            </div>

            <div className="hero-info-card">

              <small>Semester</small>

              <strong>

                {activeSemester || "--"}

              </strong>

            </div>

          </div>

        </div>

      </div>

      {/* COURSES + SEARCH + ENROLL */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <h5 className="fw-semibold text-success mb-2">Your Courses</h5>

        <Link to="/student/courses">
          <Button
            variant="success"
            className="fw-semibold"
            disabled={user?.graduated}
          >
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
          sortedCourses.map((course) => (
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