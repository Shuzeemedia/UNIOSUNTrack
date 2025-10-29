// src/components/MarkAttendance.jsx
import { useState } from "react";
import api from "../api/api";

/* eslint-disable react/prop-types */
function MarkAttendance({ courseId, students = [], onMarked, sessionActive = false }) {
  const [loadingId, setLoadingId] = useState(null);
  const [message, setMessage] = useState("");

  if (!students || students.length === 0) {
    return <p className="empty-text">No students enrolled yet.</p>;
  }

  const markAttendance = async (studentId, status) => {
    try {
      setLoadingId(studentId);
      setMessage("");
      const res = await api.post(`/attendance/${courseId}/mark/${studentId}`, { status });

      setMessage(res.data.msg || `Marked ${status}`);
      if (onMarked) await onMarked(studentId);
    } catch (err) {
      console.error("Error marking attendance:", err.response?.data || err);
      setMessage(err.response?.data?.msg || "Error marking attendance");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="mark-attendance glass-card">
      <h3 className="section-title">Mark Attendance (Manual Override)</h3>

      {sessionActive && (
        <p className="info-text warning mb-3">
          ⚠️ A live QR attendance session is active — manual marking is disabled until it ends.
        </p>
      )}

      <ul className="student-list">
        {students.map((student, index) => {
          const isLoading = loadingId === student._id;
          return (
            <li key={student._id} className="student-item">
              <div className="student-info">
                <span className="student-index">{index + 1}.</span>
                <div>
                  <p className="student-name">{student.name}</p>
                  <p className="student-id">Matric No.: {student.studentId || "N/A"}</p>
                </div>
              </div>

              <div className="attendance-btns">
                <button
                  disabled={isLoading || sessionActive}
                  onClick={() => markAttendance(student._id, "Present")}
                  className={`btn-present ${sessionActive ? "disabled" : ""}`}
                >
                  {isLoading ? "Marking..." : "Present"}
                </button>

                <button
                  disabled={isLoading || sessionActive}
                  onClick={() => markAttendance(student._id, "Absent")}
                  className={`btn-absent ${sessionActive ? "disabled" : ""}`}
                >
                  {isLoading ? "Marking..." : "Absent"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {message && <p className="status-message">{message}</p>}
    </div>
  );
}

export default MarkAttendance;
