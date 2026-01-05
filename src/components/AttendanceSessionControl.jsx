import { useState } from "react";
import api from "../api/api";

function AttendanceSessionControl({ courseId, sessionActive, setSessionActive }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  /* ================= START SESSION ================= */
  const startSession = async () => {
    try {
      setLoading(true);
      setMessage("");

      const res = await api.post("/attendance/session/start", {
        courseId,
      });

      // backend returns the created session
      setSessionActive(res.data.session);
      setMessage("Attendance session started.");
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to start session");
    } finally {
      setLoading(false);
    }
  };

  /* ================= END SESSION ================= */
  const endSession = async () => {
    try {
      setLoading(true);
      setMessage("");

      await api.post("/attendance/session/end", {
        sessionId: sessionActive._id,
      });

      setSessionActive(null);
      setMessage("Attendance session ended.");
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to end session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="session-control glass-card p-4 mb-4">
      <h3 className="section-title mb-2">Attendance Session</h3>

      {!sessionActive ? (
        <button
          onClick={startSession}
          disabled={loading}
          className="btn-present"
        >
          {loading ? "Starting..." : "Start Attendance Session"}
        </button>
      ) : (
        <>
          <p className="text-success mb-2">
            ✅ Session Active
          </p>
          <button
            onClick={endSession}
            disabled={loading}
            className="btn-absent"
          >
            {loading ? "Ending..." : "End Attendance Session"}
          </button>
        </>
      )}

      {message && <p className="status-message mt-2">{message}</p>}
    </div>
  );
}

export default AttendanceSessionControl;