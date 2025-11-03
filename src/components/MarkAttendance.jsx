// src/components/MarkAttendance.jsx
import { useState } from "react";
import api from "../api/api";

/* eslint-disable react/prop-types */
function MarkAttendance({ courseId, students = [], onMarked, sessionActive = false }) {
  const [loadingState, setLoadingState] = useState({ id: null, status: null });
  const [message, setMessage] = useState("");

  if (!students || students.length === 0) {
    return <p className="empty-text">No students enrolled yet.</p>;
  }

  const markAttendance = async (studentId, status) => {
    try {
      setLoadingState({ id: studentId, status });
      setMessage("");

      const res = await api.post(`/attendance/${courseId}/mark/${studentId}`, { status });

      setMessage(res.data.msg || `Marked ${status}`);
      if (onMarked) await onMarked(studentId);
    } catch (err) {
      console.error("Error marking attendance:", err.response?.data || err);
      setMessage(err.response?.data?.msg || "Error marking attendance");
    } finally {
      setLoadingState({ id: null, status: null });
    }
  };

  return (
    <div className="mark-attendance glass-card">
      <h3 className="section-title">Mark Attendance</h3>

      {sessionActive && (
        <p className="info-text warning mb-3">
          ⚠️ A live QR attendance session is active — manual marking is disabled until it ends.
        </p>
      )}

      <ul className="student-list">
        {students.map((student, index) => {
          const isLoading = loadingState.id === student._id; // ✅ fixed line

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
                  disabled={(loadingState.id === student._id && loadingState.status === "Present") || sessionActive}
                  onClick={() => markAttendance(student._id, "Present")}
                  className={`btn-present ${sessionActive ? "disabled" : ""}`}
                >
                  {loadingState.id === student._id && loadingState.status === "Present"
                    ? "Marking..."
                    : "Present"}
                </button>

                <button
                  disabled={(loadingState.id === student._id && loadingState.status === "Absent") || sessionActive}
                  onClick={() => markAttendance(student._id, "Absent")}
                  className={`btn-absent ${sessionActive ? "disabled" : ""}`}
                >
                  {loadingState.id === student._id && loadingState.status === "Absent"
                    ? "Marking..."
                    : "Absent"}
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
