// src/components/MarkAttendance.jsx
import { useState, useMemo, useEffect } from "react";
import api from "../api/api";
import StudentAvatar from "./StudentAvatar";
import { RiVolumeUpFill } from "react-icons/ri";


function MarkAttendance({ courseId, students = [], onMarked, sessionActive }) {
  const [loadingState, setLoadingState] = useState({ id: null, status: null });
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [rollCallMode, setRollCallMode] = useState(false);
  const [rollCallIndex, setRollCallIndex] = useState(0);
  const [rollCallData, setRollCallData] = useState([]);
  const [studentStatus, setStudentStatus] = useState({});

  // Load initial student status
  useEffect(() => {
    const initialStatus = {};
    students.forEach((s) => {
      initialStatus[s._id] = s.status || "N/A";
    });
    setStudentStatus(initialStatus);
  }, [students]);

  // Filter & sort students
  const filteredStudents = useMemo(() => {
    let list = [...students];
    if (searchQuery) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.studentId || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (sortKey === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortKey === "department")
      list.sort((a, b) =>
        (a.department?.name || "").localeCompare(b.department?.name || "")
      );
    if (sortKey === "level")
      list.sort((a, b) => (a.level || 0) - (b.level || 0));
    return list;
  }, [students, searchQuery, sortKey]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Single mark attendance
  const markAttendance = async (studentId, status) => {
    try {
      setLoadingState({ id: studentId, status });
      setMessage("");
      await api.post(`/attendance/${courseId}/mark/${studentId}`, { status });
      setStudentStatus((prev) => ({ ...prev, [studentId]: status }));
      if (onMarked) await onMarked(studentId);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.msg || "Error marking attendance");
    } finally {
      setLoadingState({ id: null, status: null });
    }
  };

  // Bulk mark
  const bulkMarkAttendance = async (status) => {
    try {
      setMessage("Saving bulk attendance...");
      const records = students.map((s) => ({ studentId: s._id, status }));
      await api.post(`/attendance/${courseId}/mark`, {
        records,
        date: new Date().toISOString().split("T")[0],
      });
      const updatedStatus = {};
      students.forEach((s) => (updatedStatus[s._id] = status));
      setStudentStatus(updatedStatus);
      setMessage(`All students marked as ${status}`);
      if (onMarked) await onMarked("bulk");
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.msg || "Error marking bulk attendance");
    }
  };

  // Roll call
  const startRollCall = () => {
    setRollCallData(filteredStudents);
    setRollCallIndex(0);
    setRollCallMode(true);
    speakName(filteredStudents[0]?.name);
  };

  const cancelRollCall = () => {
    setRollCallMode(false);
    setRollCallIndex(0);
    setRollCallData([]);
    setMessage("Roll call cancelled.");
  };

  const speakName = (name) => {
    if (!name) return;

    const utter = new SpeechSynthesisUtterance(name);

    const voices = window.speechSynthesis.getVoices();

    // PRIORITY: look for Nigerian / African / Google voices
    const preferredVoice =
      voices.find(v => v.name.toLowerCase().includes("nigeria")) ||
      voices.find(v => v.name.toLowerCase().includes("africa")) ||
      voices.find(v => v.name.includes("Google UK English")) ||
      voices.find(v => v.lang === "en-NG") || // Nigeria English code
      voices.find(v => v.lang === "en-GB") || // fallback
      voices[0];

    if (preferredVoice) {
      utter.voice = preferredVoice;
    }

    utter.rate = 0.95; // slower for name clarity
    utter.pitch = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };


  const handleNext = (status = "Present") => {
    const student = rollCallData[rollCallIndex];
    if (!student) return;

    markAttendance(student._id, status);

    const nextIndex = rollCallIndex + 1;

    if (nextIndex >= rollCallData.length) {
      setRollCallMode(false);
      setRollCallIndex(0);
      setRollCallData([]);
      setMessage("Roll call completed!");
      return;
    }

    setRollCallIndex(nextIndex);
    speakName(rollCallData[nextIndex]?.name);
  };

  const currentRollCallStudent = rollCallData[rollCallIndex];

  if (students.length === 0) return <p>No students enrolled yet.</p>;

  return (
    <div className="mark-attendance glass-card p-4">
      <h3 className="section-title mb-4">Mark Attendance</h3>

      {sessionActive && (
        <p className="info-text warning mb-3">
          ⚠️ A live QR attendance session is active — manual marking disabled.
        </p>
      )}

      {/* NOT IN ROLL CALL */}
      {!rollCallMode && (
        <>
          {/* SEARCH & SORT */}
          <div className="flex justify-between mb-3">
            <input
              type="text"
              placeholder="Search by name or matric"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />

            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="sort-select"
            >
              <option value="">Sort By</option>
              <option value="name">Name</option>
              <option value="department">Department</option>
              <option value="level">Level</option>
            </select>
          </div>

          {/* BULK BUTTONS */}
          <div className="blk_btn flex gap-2 mb-4">
            <button
              onClick={() => bulkMarkAttendance("Present")}
              className="btn-present"
            >
              Bulk Present
            </button>
            <button
              onClick={() => bulkMarkAttendance("Absent")}
              className="btn-absent"
            >
              Bulk Absent
            </button>
            <button
              onClick={() => bulkMarkAttendance("N/A")}
              className="btn-na"
            >
              Bulk N/A
            </button>
            <button onClick={startRollCall} className="btn-rollcall">
              Start Roll Call
            </button>
          </div>

          {/* STUDENT LIST */}
          <ul className="student-list">
            {paginatedStudents.map((s) => (
              <li
                key={s._id}
                className="student-item flex justify-between items-center mb-2"
              >
                <div className="hld_studlist flex items-center gap-3">
                  {/* Updated StudentAvatar usage */}
                  <StudentAvatar student={s} size={48} />

                  <div>
                    <p className="student-name">{s.name}</p>
                    <p className="student-id">{s.studentId || "N/A"}</p>
                    <p className="student-dept">
                      {s.department?.name || "N/A"} | Level: {s.level || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={studentStatus[s._id] || "N/A"}
                    onChange={(e) => markAttendance(s._id, e.target.value)}
                    disabled={loadingState.id === s._id}
                    className="attendance-dropdown"
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="N/A">N/A</option>
                  </select>

                  <span id="badge_stat"
                    className={`student-badge ${studentStatus[
                      s._id
                    ]?.toLowerCase()}`}
                  >
                    {studentStatus[s._id] || "N/A"}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* PAGINATION */}
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`page-btn ${currentPage === i + 1 ? "active" : ""}`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ROLL CALL MODE */}
      {rollCallMode && currentRollCallStudent && (
        <div className="rollcall-mode p-6 flex flex-col items-center gap-6">
          <h2>{currentRollCallStudent.name}</h2>
          <p>Matric: {currentRollCallStudent.studentId || "N/A"}</p>
          <p>Dept: {currentRollCallStudent.department?.name || "N/A"}</p>

          {/* Updated StudentAvatar for roll call */}
          <div className="hld_rollprof">
            <StudentAvatar student={currentRollCallStudent} size={128} />
          </div>

          <button
            onClick={() => speakName(currentRollCallStudent.name)}
            className="btn-repeat callagain text-white px-4 py-2 rounded"
          >
            <RiVolumeUpFill size={22} color="#0b6623" />
          </button>

          <div className="roll_btn flex gap-4 mt-4">
            <button
              onClick={() => handleNext("Absent")}
              className="btn-absent btn-lg"
            >
              Absent
            </button>
            <button
              onClick={() => handleNext("Present")}
              className="btn-present btn-lg"
            >
              Next / Present
            </button>
          </div>

          <button
            onClick={cancelRollCall}
            className="can_roll btn-cancel mt-4 bg-warning text-white px-4 py-2 rounded"
          >
            Cancel Roll Call
          </button>
        </div>
      )}

      {message && <p className="status-message mt-3">{message}</p>}
    </div>
  );
}

export default MarkAttendance;