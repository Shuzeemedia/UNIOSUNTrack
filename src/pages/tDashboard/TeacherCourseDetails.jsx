import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import AttendanceFilter from "../../components/attFilter/AttendanceFilter";
import { getFilterParams } from "../../utils/attendanceUtils";
import TeacherAttendanceChart from "../../components/TattChart/TeacherAttendanceChart";
import AttendanceHeader from "../../components/AttendanceHeader";
import StudentAttendanceTable from "../../components/attChart/StudentAttendanceTable";
import MarkAttendance from "../../components/MarkAttendance";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import "./teacherCourseDetails.css";

const TeacherCourseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentHistory, setStudentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); // ✅ inline error message

  const [filter, setFilter] = useState("today");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [deptFilter, setDeptFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");

  const [sessionActive, setSessionActive] = useState(false);

  useEffect(() => {
    const loadCourseData = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await api.get(`/courses/${id}`);
        setCourse(res.data);
        setStudents(res.data.students || []);
      } catch {
        setError("Failed to fetch course details");
      }

      try {
        const params = getFilterParams(filter, date);
        const sumRes = await api.get(`/attendance/${id}/summary`, { params });
        setAttendanceSummary(sumRes.data.summary || []);
      } catch {
        setError("Failed to fetch attendance summary");
      }

      setLoading(false);
    };

    if (id) loadCourseData();
  }, [id, filter, date]);

  useEffect(() => {
    if (!id) return;

    const checkSession = async () => {
      try {
        const res = await api.get(`/sessions/active/${id}`);
        setSessionActive(res.data.active || false);
      } catch {
        // silent fail
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchStudentHistory = async (studentId) => {
    setSelectedStudent(studentId);
    try {
      const params = getFilterParams(filter, date);
      const res = await api.get(`/attendance/${id}/student/${studentId}`, { params });
      setStudentHistory(res.data.records || []);
    } catch {
      setStudentHistory([]);
    }
  };

  const handleMarked = async (studentId) => {
    try {
      const params = getFilterParams(filter, date);
      const sumRes = await api.get(`/attendance/${id}/summary`, { params });
      setAttendanceSummary(sumRes.data.summary || []);
    } catch {
      // silent fail
    }

    if (selectedStudent === studentId) {
      await fetchStudentHistory(studentId);
    }
  };

  const handleBackToSummary = () => {
    setSelectedStudent(null);
    setStudentHistory([]);
  };

  const handleGenerateQR = () => {
    navigate(`/teacher/qr/${id}`);
  };

  const normalizeDept = (student) =>
    typeof student.department === "string"
      ? student.department
      : student.department?.name || "N/A";

  const normalizeLevel = (student) =>
    student.level ? String(student.level) : student.level?.name || "N/A";

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const dept = normalizeDept(s);
      const level = normalizeLevel(s);
      const deptMatch = deptFilter ? dept === deptFilter : true;
      const levelMatch = levelFilter ? level === levelFilter : true;
      return deptMatch && levelMatch;
    });
  }, [students, deptFilter, levelFilter]);

  const filteredAttendanceSummary = useMemo(() => {
    return attendanceSummary.filter((rec) => {
      if (!rec.student) return true;
      const student = students.find((s) => s._id === rec.student._id);
      if (!student) return false;
      const dept = normalizeDept(student);
      const level = normalizeLevel(student);
      const deptMatch = deptFilter ? dept === deptFilter : true;
      const levelMatch = levelFilter ? level === levelFilter : true;
      return deptMatch && levelMatch;
    });
  }, [attendanceSummary, students, deptFilter, levelFilter]);

  if (loading) return <LoadingSpinner />;
  if (!course) return <p className="error-text">{error || "Course not found"}</p>;

  const deptOptions = [...new Set(students.map(normalizeDept).filter(Boolean))];
  const levelOptions = [...new Set(students.map(normalizeLevel).filter((lvl) => lvl !== "N/A"))];

  return (
    <div className="teacher-course-details">
      {/* ===== HEADER CARD ===== */}
      <div className="Tcourse-header-card glass-card">
        <div className="header-info">
          <h2>{course.name}</h2>
          <p className="tcourse-code">{course.code}</p>
          <div className="header-meta">
            <p><strong>Lecturer:</strong> {course.teacher?.name || "N/A"}</p>
            <p><strong>Course Unit:</strong> {course.unit ?? "N/A"}</p>
          </div>
        </div>

        <div className="qr-button-wrap">
          <button onClick={handleGenerateQR} className="qr-btn">
            <img src="/ranks/qricon.png" alt="QRCode Gen" className="qricon" />
            Generate QR for Attendance
          </button>
        </div>
      </div>

      {/* ===== FILTERS ===== */}
      <div className="filters-container">
        <div className="attendance-filter-wrap">
          <AttendanceFilter filter={filter} setFilter={setFilter} date={date} setDate={setDate} />
        </div>

        <div className="select-filters">
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {deptOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="">All Levels</option>
            {levelOptions.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ===== MARK ATTENDANCE SECTION ===== */}
      <MarkAttendance
        courseId={id}
        students={filteredStudents}
        onMarked={handleMarked}
        sessionActive={sessionActive}
      />

      {/* ===== SUMMARY ===== */}
      {!selectedStudent ? (
        <>
          <h3 className="section-title">
            <AttendanceHeader filter={filter} date={date} />
          </h3>

          {filteredAttendanceSummary.length === 0 ? (
            <p className="empty-text">No attendance records found.</p>
          ) : (
            <>
              <div className="summary-card glass-card">
                <StudentAttendanceTable
                  attendanceSummary={filteredAttendanceSummary}
                  onStudentClick={fetchStudentHistory}
                  course={course}
                />
              </div>

              <div className="chart-card glass-card mt-5">
                {/* <h3 className="section-title">Attendance Chart</h3> */}
                <TeacherAttendanceChart data={filteredAttendanceSummary} />
              </div>
            </>
          )}
        </>
      ) : (
        <div className="student-history glass-card">
          <div className="flex items-center justify-between mb-3">
            <h3>
              Attendance History: {" "}
              {students.find((s) => s._id === selectedStudent)?.name || "Student"}
            </h3>
            <button onClick={handleBackToSummary} className="back-btn">Back to Summary</button>
          </div>

          {studentHistory.length === 0 ? (
            <p className="empty-text">No records found for this student.</p>
          ) : (
            <ul className="history-list">
              {studentHistory.map((r) => (
                <li key={r._id}>
                  {new Date(r.date).toLocaleDateString()} {" "}
                  <span className={r.status === "Present" ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherCourseDetails;
