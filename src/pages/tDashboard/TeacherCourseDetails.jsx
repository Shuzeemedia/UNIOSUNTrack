import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import AttendanceFilter from "../../components/attFilter/AttendanceFilter";
// import { getFilterParams } from "../../utils/attendanceUtils";
import TeacherAttendanceChart from "../../components/TattChart/TeacherAttendanceChart";
import AttendanceHeader from "../../components/AttendanceHeader";
import StudentAttendanceTable from "../../components/attChart/StudentAttendanceTable";
import StudentSummaryTable from "../../components/attChart/StudentSummaryTable";


import MarkAttendance from "../../components/MarkAttendance";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import socket from "../../socket";

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
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("today");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [deptFilter, setDeptFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [sessionActive, setSessionActive] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");
  const [sessionAttendance, setSessionAttendance] = useState([]);
  const [countdown, setCountdown] = useState(null);



  /** ====================== STUDENT HISTORY PAGINATION ====================== */
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 10;

  const historyTotalPages = Math.ceil(studentHistory.length / historyPageSize);
  const paginatedHistory = studentHistory.slice(
    (historyPage - 1) * historyPageSize,
    historyPage * historyPageSize
  );

  const buildAttendanceParams = () => {
    if (filter === "today") {
      return { filter: "today" };
    }

    if (filter === "date" && date) {
      return { filter: "date", date };
    }

    return { filter: "all" };
  };



  /** ======================================================================= */

  /** ====================== LOAD COURSE & STUDENTS ====================== */
  useEffect(() => {
    const loadCourseData = async () => {
      setLoading(true);
      setError("");

      try {
        // Fetch course details
        const res = await api.get(`/courses/${id}`);
        const courseData = res.data;
        setCourse(courseData);

        // Fetch enrolled students
        const studentsRes = await api.get(`/courses/${id}/students`);
        const studentsData = studentsRes.data.students || [];
        setStudents(studentsData);

        const params = buildAttendanceParams();
        const sumRes = await api.get(`/attendance/${id}/summary`, { params });

        const summary = sumRes.data.summary || [];

        // ✅ If no classes held → no attendance
        if (summary.length === 0) {
          setAttendanceSummary([]);
          setLoading(false);
          return;
        }

        const classesHeld = sumRes.data.classesHeld || 0;



        // ✅ Merge ONLY when attendance exists
        const mergedSummary = studentsData.map((s) => {
          const record = summary.find((rec) => rec.student._id === s._id);

          return {
            student: s,
            present: record?.present || 0,
            absent: record?.absent || 0,
            classesHeld: record?.classesHeld || 0,
            totalPlanned: record?.totalPlanned || courseData.totalClasses || 0,
            attendancePct: record?.attendancePct || 0,
            score: record?.score || 0,
          };
        });


        setAttendanceSummary(mergedSummary);


      } catch (err) {
        setError("Failed to fetch course, students, or attendance");
        setAttendanceSummary([]);
      }

      setLoading(false);
    };

    if (id) loadCourseData();
  }, [id, filter, date]); // <-- REMOVE students and course?.totalClasses



  useEffect(() => {
    if (!id) return;

    const checkSession = async () => {
      try {
        const res = await api.get(`/sessions/active/${id}`);
        setSessionActive(res.data.active ? res.data.session : null);
      } catch {
        setSessionActive(null);
      }
    };

    checkSession();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const handler = async (payload) => {
      if (payload.courseId !== id) return;

      console.log("♻ Attendance updated for this course:", payload);

      const params = buildAttendanceParams();

      // Refresh records
      try {
        const recRes = await api.get(`/attendance/${id}`, { params });
        setSessionAttendance(recRes.data.records || []);
      } catch {
        setSessionAttendance([]);
      }

      // Refresh summary
      try {
        const sumRes = await api.get(`/attendance/${id}/summary`, { params });
        const summary = sumRes.data.summary || [];
        const classesHeld = sumRes.data.classesHeld || 0;

        const merged = students.map((s) => {
          const record = summary.find((r) => r._id === s._id);
          return {
            student: s,
            totalPresent: record?.present || 0,
            totalAbsent: record?.absent || 0,
            classesHeld,
            totalPlanned: course?.totalClasses || 0,
          };
        });

        setAttendanceSummary(merged);
      } catch (err) {
        console.error("Summary refresh failed", err);
      }
    };

    socket.on("attendance-updated", handler);
    return () => socket.off("attendance-updated", handler);
  }, [id, filter, date, students, course]);



  // Update countdown whenever sessionActive changes
  useEffect(() => {
    if (!sessionActive) {
      setCountdown(null);
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = new Date(sessionActive.expiresAt) - new Date();
      if (remainingMs <= 0) {
        clearInterval(interval);
        setCountdown(null);
        setSessionActive(null);
        setSessionMessage("Manual session expired");
      } else {
        const totalSeconds = Math.floor(remainingMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        setCountdown(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionActive]);


  useEffect(() => {
    if (!id) return;

    const fetchSessionAttendance = async () => {
      try {
        const params = buildAttendanceParams();
        const res = await api.get(`/attendance/${id}`, { params });


        // MUST be raw records with session populated
        setSessionAttendance(res.data.records || []);
      } catch {
        setSessionAttendance([]);
      }
    };

    fetchSessionAttendance();
  }, [id, filter, date]);

  useEffect(() => {
    socket.emit("join-course", id);
    return () => socket.emit("leave-course", id);
  }, [id]);


  const handleStudentClick = async (studentId) => {
    await fetchStudentHistory(studentId);
  };





  /** ====================== FETCH STUDENT HISTORY ====================== */
  const fetchStudentHistory = async (studentId) => {
    setSelectedStudent(studentId);
    setHistoryPage(1);

    try {
      const params = buildAttendanceParams();
      const res = await api.get(
        `/attendance/${id}/student/${studentId}`,
        { params }
      );

      setStudentHistory(res.data.records || []);
    } catch {
      setStudentHistory([]);
    }
  };

  const handleMarked = async (studentId, status) => {
    try {
      const params = buildAttendanceParams();

      // 1️⃣ Update attendance in backend
      await api.post(`/attendance/${id}/mark`, { studentId, status });

      // 2️⃣ Optimistically update sessionAttendance for immediate UI


      // 3️⃣ Refresh SUMMARY
      const sumRes = await api.get(`/attendance/${id}/summary`, { params });
      const summary = sumRes.data.summary || [];
      const classesHeld = sumRes.data.classesHeld || 0;

      const mergedSummary = students.map((s) => {
        const record = summary.find((rec) => rec._id === s._id);
        return {
          student: s,
          totalPresent: record?.present || 0,
          totalAbsent: record?.absent || 0,
          classesHeld,
          totalPlanned: course?.totalClasses || 0,
        };
      });

      setAttendanceSummary(mergedSummary);

      // 4️⃣ Refresh student history if viewing that student
      if (selectedStudent === studentId) {
        await fetchStudentHistory(studentId);
      }

    } catch (err) {
      console.error("Failed to mark attendance", err);
    }
  };



  const handleBackToSummary = () => {
    setSelectedStudent(null);
    setStudentHistory([]);
    setHistoryPage(1);
  };

  const handleGenerateQR = () => {
    navigate(`/teacher/qr/${id}`);
  };

  const startSession = async () => {
    try {
      setSessionLoading(true);
      setSessionMessage("");

      const res = await api.post(`/sessions/${id}/create`, {
        type: "manual",
      });

      const sessionData = {
        _id: res.data.sessionId,
        expiresAt: new Date(res.data.expiresAt),
        type: res.data.type,
      };

      setSessionActive(sessionData);
      setSessionMessage("Attendance session started");

      // Auto-expire in 10 minutes (600,000ms)
      setTimeout(() => {
        setSessionActive(null);
        setSessionMessage("Manual session expired");
      }, 10 * 60 * 1000); // 10 minutes

    } catch (err) {
      setSessionMessage(
        err.response?.data?.msg || "Failed to start session"
      );
    } finally {
      setSessionLoading(false);
    }
  };



  const endSession = async () => {
    try {
      setSessionLoading(true);
      setSessionMessage("");

      await api.post(`/sessions/${sessionActive._id}/end`);


      setSessionActive(null);
      setSessionMessage("Attendance session ended");
    } catch (err) {
      setSessionMessage(
        err.response?.data?.msg || "Failed to end session"
      );
    } finally {
      setSessionLoading(false);
    }
  };

  /** ====================== NORMALIZE & FILTER ====================== */
  const normalizeDept = (student) =>
    typeof student.department === "string"
      ? student.department
      : student.department?.name || "N/A";

  const normalizeLevel = (student) =>
    typeof student.level === "string" || typeof student.level === "number"
      ? String(student.level)
      : student.level?.name || "N/A";

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
      const dept = normalizeDept(rec.student);
      const level = normalizeLevel(rec.student);
      const deptMatch = deptFilter ? dept === deptFilter : true;
      const levelMatch = levelFilter ? level === levelFilter : true;
      return deptMatch && levelMatch;
    });
  }, [attendanceSummary, deptFilter, levelFilter]);

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
            <p>
              <strong>Lecturer:</strong> {course.teacher?.name || "N/A"}
            </p>
            <p>
              <strong>Course Unit:</strong> {course.unit ?? "N/A"}
            </p>
          </div>
        </div>
        <div className="qr-button-wrap">
          <button
            onClick={handleGenerateQR}
            className="qr-btn"
            disabled={sessionActive?.type === "manual"} // disable if manual session is active
            title={sessionActive?.type === "manual" ? "QR disabled during manual session" : ""}
          >
            <img src="/ranks/qricon.png" alt="QRCode Gen" className="qricon" />
            Generate QR for Attendance
          </button>
        </div>

      </div>

      {/* ===== FILTERS ===== */}
      <div className="filters-container">
        <div className="attendance-filter-wrap">
          <AttendanceFilter
            filter={filter}
            setFilter={setFilter}
            date={date}
            setDate={setDate}
          />
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

      {/* ===== SESSION CONTROL ===== */}
      <div className="glass-card p-4 mb-4">
        <h3 className="section-title mb-2">Attendance Session</h3>

        {!sessionActive ? (
          <button
            onClick={startSession}
            disabled={sessionLoading}
            className="btn-present"
          >
            Start Attendance Session
          </button>
        ) : (
          <button
            onClick={endSession}
            disabled={sessionLoading}
            className="btn-absent"
          >
            End Attendance Session
          </button>
        )}

        {sessionActive && countdown && (
          <p className="status-message">
            Session expires in: {countdown} ⏱
          </p>
        )}

        {sessionMessage && (
          <p className="status-message mt-2">{sessionMessage}</p>
        )}
      </div>


      {/* ===== MARK ATTENDANCE ===== */}
      <MarkAttendance
        courseId={id}
        students={filteredStudents}
        onMarked={handleMarked}
        sessionActive={sessionActive}
      />

      <h3 className="section-title mt-5">Attendance Records</h3>

      {sessionAttendance.length === 0 ? (
        <p className="empty-text">No attendance records found.</p>
      ) : (
        <StudentAttendanceTable
          attendanceSummary={sessionAttendance}
          course={course}
        />
      )}


      {/* ===== SUMMARY / STUDENT HISTORY ===== */}
      {!selectedStudent ? (
        <>
          <h3 className="section-title">
            {/* <AttendanceHeader filter={filter} date={date} /> */}
          </h3>
          {filteredAttendanceSummary.length === 0 ? (
            <p className="empty-text">No attendance records found.</p>
          ) : (
            <>
              <div className="summary-card glass-card">
                <StudentSummaryTable
                  data={filteredAttendanceSummary} // ✅ use state/memo
                  course={course}
                  onStudentClick={handleStudentClick}
                />





              </div>
              <div className="chart-card glass-card mt-5">
                <TeacherAttendanceChart data={filteredAttendanceSummary} />
              </div>
            </>
          )}
        </>
      ) : (
        <div className="student-history glass-card">
          <div className="flex items-center justify-between mb-3">
            <h3>
              Attendance History:{" "}
              {students.find((s) => s._id === selectedStudent)?.name || "Student"}
            </h3>
            <button onClick={handleBackToSummary} className="back-btn">
              Back to Summary
            </button>
          </div>

          {studentHistory.length === 0 ? (
            <p className="empty-text">No records found for this student.</p>
          ) : (
            <>
              <ul className="history-list">
                {paginatedHistory.map((r) => (
                  <li key={r._id}>
                    {new Date(r.date).toLocaleDateString()}{" "}
                    <span
                      className={
                        r.status === "Present"
                          ? "text-green-600 font-medium"
                          : "text-red-500 font-medium"
                      }
                    >
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>

              {historyTotalPages > 1 && (
                <div className="pagination mt-3">
                  <button disabled={historyPage === 1} onClick={() => setHistoryPage((p) => Math.max(p - 1, 1))}>
                    ◀ Prev
                  </button>
                  <span>
                    Page {historyPage} of {historyTotalPages}
                  </span>
                  <button
                    disabled={historyPage === historyTotalPages}
                    onClick={() => setHistoryPage((p) => Math.min(p + 1, historyTotalPages))}
                  >
                    Next ▶
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherCourseDetails;