// src/pages/CourseDetails.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/api";

const CourseDetails = () => {
  const { id: courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Fetch course and enrolled students
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await api.get(`/courses/${courseId}`);
        setCourse(res.data);
        setStudents(res.data.students || []);
      } catch (err) {
        console.error("Error fetching course details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId]);

  // Mark attendance for a student
  const markAttendance = async (studentId, status) => {
    try {
      await api.post(`/attendance/${courseId}/mark/${studentId}`, { status });
      setStudents((prev) =>
        prev.map((s) => (s._id === studentId ? { ...s, status } : s))
      );
    } catch (err) {
      console.error("Failed to mark attendance:", err.response?.data || err.message);
    }
  };

  // Fetch summary report
  const fetchSummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await api.get(`/attendance/${courseId}/summary`);
      setSummary(res.data.summary || []);
    } catch (err) {
      console.error("Failed to fetch summary:", err.response?.data || err.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!course) return <p>Course not found</p>;

  return (
    <div>
      <h2>{course.name}</h2>
      <p>Teacher: {course.teacherName}</p>

      {/* Attendance table */}
      <h3>Attendance</h3>
      <table border="1" cellPadding="8" style={{ marginTop: "10px" }}>
        <thead>
          <tr>
            <th>Student</th>
            <th>Email</th>
            <th>Status</th>
            <th>Mark</th>
          </tr>
        </thead>
        <tbody>
          {students.length > 0 ? (
            students.map((s) => (
              <tr key={s._id}>
                <td>{s.name}</td>
                <td>{s.email}</td>
                <td>{s.status || "-"}</td>
                <td>
                  <button onClick={() => markAttendance(s._id, "Present")}>
                    Present
                  </button>
                  <button onClick={() => markAttendance(s._id, "Absent")}>
                    Absent
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ textAlign: "center" }}>
                No students enrolled
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Attendance summary */}
      <div style={{ marginTop: "20px" }}>
        <h3>Attendance Summary</h3>
        <button onClick={fetchSummary} disabled={loadingSummary}>
          {loadingSummary ? "Loading..." : "View Summary"}
        </button>

        {summary && summary.length > 0 && (
          <table border="1" cellPadding="8" style={{ marginTop: "10px" }}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Total Present</th>
                <th>Total Absent</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.student._id}>
                  <td>{s.student.name}</td>
                  <td>{s.student.email}</td>
                  <td>{s.totalPresent}</td>
                  <td>{s.totalAbsent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CourseDetails;
