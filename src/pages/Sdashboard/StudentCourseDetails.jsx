import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../api/api"; // ✅ offline-aware global Axios
import AttendanceFilter from "../../components/attFilter/AttendanceFilter";
import {
  getFilterParams,
  computeSummary,
  ATTENDANCE_THRESHOLD,
} from "../../utils/attendanceUtils";
import StudentAttendanceChart from "../../components/attChart/StudentAttendanceChart";
import AttendanceHeader from "../../components/AttendanceHeader";
import StudentAttendanceTable from "../../components/attChart/StudentAttendanceTable";
import { AuthContext } from "../../context/AuthContext";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import { Button, Spinner, Alert } from "react-bootstrap";
import {
  FaBookOpen,
  FaChalkboardTeacher,
  FaBuilding,
  FaGraduationCap,
  FaLayerGroup,
  FaCheckCircle,
  FaTimesCircle,
  FaChartLine,
  FaStar,
} from "react-icons/fa";

import {
  HiOutlineQrCode,
  HiOutlineClock
} from "react-icons/hi2";
import "./studentCourseDetails.css";

const StudentCourseDetails = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false); // filter changes
  const [summary, setSummary] = useState({
    total: 0,
    present: 0,
    absent: 0,
    percentage: 0,
    xp: 0,
  });

  const [filter, setFilter] = useState("today");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Active QR session
  const [activeSession, setActiveSession] = useState(null);
  const isQrActive = activeSession && activeSession.type === "QR";
  const [sessionLoading, setSessionLoading] = useState(false);

  const [error, setError] = useState(""); // new inline error state

  useEffect(() => {
    fetchCourseData(true);
  }, [id]);

  useEffect(() => {
    if (course) {
      fetchCourseData(false);
    }
  }, [filter, date]);

  useEffect(() => {
    fetchActiveSession();
  }, [id]);


  // Fetch course + attendance records
  const fetchCourseData = async (initialLoad = false) => {
    try {
      if (initialLoad) {
        setLoading(true);
      } else {
        setFetching(true);
      }

      setError("");



      const { data: courseData } = await API.get(`/courses/${id}`);
      setCourse(courseData.course || courseData);

      const { data: attendanceData } = await API.get(
        `/attendance/my-summary/${id}`,
        { params: getFilterParams(filter, date) }
      );

      // Use records from backend
      const records = attendanceData.records || [];
      setRecords(records);

      // If you want, you can compute summary client-side too
      const backendSummary = attendanceData.summary || {};

      setSummary({
        total: backendSummary.present + backendSummary.absent, // now total = 12
        present: backendSummary.present,
        absent: backendSummary.absent,
        percentage: backendSummary.attendancePercentage, // keep backend %
        xp: backendSummary.score,
      });




    } catch (err) {
      if (err.isOffline) {
        setError("You are offline. Cannot fetch course/attendance data.");
      } else {
        setError(err.response?.data?.msg || "Failed to fetch course/attendance data.");
      }
    } finally {
      if (initialLoad) {
        setLoading(false);
      } else {
        setFetching(false);
      }
    }
  };

  // Fetch active QR session for this course
  const fetchActiveSession = async () => {
    try {
      setSessionLoading(true);
      const { data } = await API.get(`/sessions/active/${id}`, {
        headers: { "x-silent": "true" },
      });
      setActiveSession(data.session || null);
    } catch (err) {
      setActiveSession(null);
    } finally {
      setSessionLoading(false);
    }
  };

  // Redirect to scan page when active QR exists
  const handleScanClick = async (e) => {
    e.preventDefault();
    setError("");

    if (!activeSession) {
      setError("No active QR session at the moment.");
      return;
    }

    try {
      const res = await API.get(`/sessions/check`, {
        params: { sessionId: activeSession._id }
      });

      // ✅ If already marked → go to dashboard
      if (res.data.alreadyMarked) {
        navigate("/dashboard/student", {
          replace: true,
          state: { msg: "Attendance already marked for this session" }
        });
        return;
      }

      // ✅ Otherwise → go to scan page
      navigate(`/student/scan/${activeSession.token}`);

    } catch (err) {
      // fallback: allow scan if check fails
      navigate(`/student/scan/${activeSession.token}`);
    }
  };



  if (loading) return <LoadingSpinner />;
  if (!course) return <p>{error || "Course not found"}</p>;

  return (
    <div className="course-details-container">
      {/* HEADER SECTION */}

      <div className="course-header-card">

        <div className="course-header-left">

          <div className="course-title-row">

            <div className="course-icon-box">
              <FaBookOpen />
            </div>

            <div>
              <h2>{course?.name}</h2>
              <span className="course-code">
                {course?.code}
              </span>
            </div>

          </div>

          <div className="course-meta">

            <div className="meta-chip">
              <FaChalkboardTeacher />
              <span>{course.teacher?.name || "N/A"}</span>
            </div>

            <div className="meta-chip">
              <FaBuilding />
              <span>{course.department?.name || "N/A"}</span>
            </div>

            <div className="meta-chip">
              <FaGraduationCap />
              <span>{course.level || "N/A"} Level</span>
            </div>

            <div className="meta-chip">
              <FaLayerGroup />
              <span>{course.unit || "N/A"} Units</span>
            </div>

          </div>

        </div>

        <div className="scan-section">

          <small className={`scan-status ${isQrActive ? "active" : "inactive"}`}>
            {isQrActive ? "QR Session Live" : "No Active Session"}
          </small>

          {sessionLoading ? (
            <Spinner animation="border" size="sm" variant="success" />
          ) : (
            <Button
              className={`scan-btn ${isQrActive ? "active" : "disabled"}`}
              disabled={!isQrActive}
              onClick={handleScanClick}
            >
              {isQrActive ? (
                <HiOutlineQrCode size={22} />
              ) : (
                <HiOutlineClock size={22} />
              )}

              <span>
                {isQrActive ? "Scan Attendance QR" : "Waiting for Lecturer"}
              </span>
            </Button>
          )}

        </div>

      </div>

      {/* Show inline error if exists */}
      {error && <Alert variant="warning" className="my-3">{error}</Alert>}

      {/* FILTER + HEADER */}
      <div className="filter-section">

        <div className="filter-header">
          <AttendanceFilter
            filter={filter}
            setFilter={setFilter}
            date={date}
            setDate={setDate}
          />

          {fetching && (
            <Spinner
              animation="border"
              size="sm"
              variant="success"
            />
          )}
        </div>

        <AttendanceHeader
          filter={filter}
          date={date}
        />

      </div>

      {/* SUMMARY SECTION */}
      <div className="summary-section">

        <div className="summary-card">
          <StudentAttendanceChart summary={summary} />
        </div>

        <div className="summary-stats">

          <div className="stat-box">
            <FaBookOpen className="stat-icon" />
            <div>
              <span className="stat-value">{summary.total}</span>
              <small>Total Classes</small>
            </div>
          </div>

          <div className="stat-box">
            <FaCheckCircle className="stat-icon success" />
            <div>
              <span className="stat-value">{summary.present}</span>
              <small>Present</small>
            </div>
          </div>

          <div className="stat-box">
            <FaTimesCircle className="stat-icon danger" />
            <div>
              <span className="stat-value">{summary.absent}</span>
              <small>Absent</small>
            </div>
          </div>

          <div className="stat-box">
            <FaChartLine className="stat-icon primary" />
            <div>
              <span className="stat-value">
                {Number(summary.percentage).toFixed(1)}%
              </span>
              <small>Attendance</small>
            </div>
          </div>

          <div className="stat-box">
            <FaStar className="stat-icon gold" />
            <div>
              <span className="stat-value">
                {Number.isFinite(summary.xp)
                  ? summary.xp.toFixed(2)
                  : "0.00"}
              </span>
              <small>XP Score</small>
            </div>
          </div>

        </div>

        <div className="summary-alert">
          {summary.total === 0 ? (
            <>
              <FaBookOpen />
              <span>No attendance records available yet.</span>
            </>
          ) : summary.percentage >= ATTENDANCE_THRESHOLD ? (
            <>
              <FaCheckCircle />
              <span>
                Great job! Your attendance meets the required {ATTENDANCE_THRESHOLD}%.
              </span>
            </>
          ) : (
            <>
              <FaTimesCircle />
              <span>
                Your attendance is below the required {ATTENDANCE_THRESHOLD}%. Attend
                more classes to avoid penalties.
              </span>
            </>
          )}
        </div>

      </div>

      {/* 
      <div className="student-summary-card">
        <p><strong>Total Classes:</strong> {records.length}</p>
        <p><strong>Present:</strong> {records.filter(r => r.status === "Present").length}</p>
        <p><strong>Absent:</strong> {records.filter(r => r.status === "Absent").length}</p>
      </div> */}



      {/* ATTENDANCE RECORDS TABLE */}
      <div className="records-card">
        {/* <h3>My Attendance Records</h3> */}
        <StudentAttendanceTable
          attendanceSummary={records}
          studentView
          course={course}
          studentName={user?.name || "N/A"}
        />
      </div>
    </div>
  );
};

export default StudentCourseDetails;