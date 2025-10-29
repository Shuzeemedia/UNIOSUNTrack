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
import "./studentCourseDetails.css";

const StudentCourseDetails = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total: 0,
    present: 0,
    absent: 0,
    percentage: 0,
  });

  const [filter, setFilter] = useState("today");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Active QR session
  const [activeSession, setActiveSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  const [error, setError] = useState(""); // ✅ new inline error state

  useEffect(() => {
    fetchCourseData();
  }, [id, filter, date]);

  useEffect(() => {
    fetchActiveSession();
  }, [id]);

  // Fetch course + attendance records
  const fetchCourseData = async () => {
    try {
      setLoading(true);
      setError("");

      const { data: courseData } = await API.get(`/courses/${id}`);
      setCourse(courseData.course || courseData);

      const { data: attendanceData } = await API.get(
        `/attendance/my-records/${id}`,
        { params: getFilterParams(filter, date) }
      );

      const records = attendanceData.records || [];
      setRecords(records);
      setSummary(computeSummary(records));
    } catch (err) {
      if (err.isOffline) {
        setError("You are offline. Cannot fetch course/attendance data.");
      } else {
        setError(err.response?.data?.msg || "Failed to fetch course/attendance data.");
      }
    } finally {
      setLoading(false);
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
  const handleScanClick = (e) => {
    e.preventDefault();
    if (activeSession) {
      navigate(`/student/scan/${activeSession.token}`);
    } else {
      setError("No active QR session at the moment.");
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!course) return <p>{error || "Course not found"}</p>;

  return (
    <div className="course-details-container">
      {/* HEADER SECTION */}
      <div className="course-header-card">
        <div className="course-header-info">
          <h2>{course?.name}</h2>
          <p className="course-code">{course?.code}</p>

          <div className="course-meta">
            <span>
              <strong>Lecturer:</strong> {course.teacher?.name || "N/A"}
            </span>
            <span>
              <strong>Department:</strong> {course.department?.name || "N/A"}
            </span>
            <span>
              <strong>Level:</strong> {course.level || "N/A"}
            </span>
            <span>
              <strong>Unit:</strong> {course.unit || "N/A"}
            </span>
          </div>
        </div>

        {/* NEW QR SCAN BUTTON SECTION */}
        <div className="scan-section">
          {sessionLoading ? (
            <Spinner animation="border" size="sm" variant="success" />
          ) : (
            <Button
              variant={activeSession ? "success" : "secondary"}
              onClick={handleScanClick}
            >
              <img
                src="/ranks/scanem.png"
                alt="ScanQRCode Gen"
                className="qricon scanX"
              />
              {activeSession ? "Scan QR / Mark Attendance" : "No Active Session"}
            </Button>
          )}
        </div>
      </div>

      {/* Show inline error if exists */}
      {error && <Alert variant="warning" className="my-3">{error}</Alert>}

      {/* FILTER + HEADER */}
      <div className="filter-section">
        <AttendanceFilter
          filter={filter}
          setFilter={setFilter}
          date={date}
          setDate={setDate}
        />
        <AttendanceHeader filter={filter} date={date} />
      </div>

      {/* SUMMARY SECTION */}
      <div className="summary-section">
        <div className="summary-card">
          <StudentAttendanceChart summary={summary} />
        </div>
        <div className="summary-stats">
          <h4>Summary</h4>
          <p>
            <strong>Total Classes:</strong> {summary.total}
          </p>
          <p>
            <strong>Present:</strong> {summary.present}
          </p>
          <p>
            <strong>Absent:</strong> {summary.absent}
          </p>
          <p>
            <strong>Attendance %:</strong>{" "}
            {isNaN(Number(summary?.percentage))
              ? "0.0"
              : Number(summary?.percentage || 0).toFixed(1)}
            %
          </p>

          {summary.percentage < ATTENDANCE_THRESHOLD && summary.total > 0 && (
            <p className="warning-text">
              ⚠️ Attendance below {ATTENDANCE_THRESHOLD}%. You may be at risk.
            </p>
          )}
        </div>
      </div>

      {/* ATTENDANCE RECORDS TABLE */}
      <div className="records-card">
        <h3>My Attendance Records</h3>
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
