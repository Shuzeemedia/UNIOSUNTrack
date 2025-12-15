import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import { AuthContext } from "../../context/AuthContext";
import { Form, Col, Button } from "react-bootstrap";
import "./studentCourses.css";

const StudentCourses = () => {
  const { user } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingCourseId, setLoadingCourseId] = useState(null);

  const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // =================== Fetch Courses ===================
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return toast.error("Please log in first.");

        const coursesRes = await axios.get(`${API_BASE_URL}/courses/available`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Map enrolled status
        const coursesWithEnroll = coursesRes.data.map((c) => ({
          ...c,
          enrolled: c.students?.some(
            (s) => (typeof s === "object" ? s._id === user._id : s === user._id)
          ),
        }));

        setCourses(coursesWithEnroll);
      } catch (err) {
        console.error("Error loading courses:", err);
        toast.error(err.response?.data?.msg || "Failed to load courses.");
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchCourses();
  }, [user]);

  // =================== Filter Logic ===================
  useEffect(() => {
    const search = searchTerm.trim().toLowerCase();
    const filtered = courses.filter(
      (c) =>
        !search ||
        (c.name && c.name.toLowerCase().includes(search)) ||
        (c.code && c.code.toLowerCase().includes(search)) ||
        (c.teacher?.name && c.teacher.name.toLowerCase().includes(search)) ||
        (c.semesterName && c.semesterName.toLowerCase().includes(search))
    );
    setFilteredCourses(filtered);
  }, [courses, searchTerm]);

  // =================== Self Enroll ===================
  const handleEnroll = async (courseId) => {
    setLoadingCourseId(courseId);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/courses/${courseId}/self-enroll`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCourses((prev) =>
        prev.map((c) => (c._id === courseId ? { ...c, enrolled: true } : c))
      );

      toast.success(res.data.msg || "Enrolled successfully!");
    } catch (err) {
      console.error("Enroll error:", err);
      toast.error(err.response?.data?.msg || "Failed to enroll.");
    } finally {
      setLoadingCourseId(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="student-courses-container">
      <h2>Available Courses</h2>

      {/* =================== Search Bar =================== */}
      <Form className="filter-bar glass-card p-3 mb-3">
        <Col xs={12} md={6}>
          <Form.Control
            type="text"
            placeholder="Search by name, code, teacher, or semester..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Col>
        <Col xs={12} md={2} className="mt-2 mt-md-0">
          <Button
            className="w-100 btn-secondary"
            onClick={() => setSearchTerm("")}
          >
            Reset
          </Button>
        </Col>
      </Form>

      {/* =================== Courses List =================== */}
      {filteredCourses.length === 0 ? (
        <p>No courses found.</p>
      ) : (
        <div className="course-list">
          {filteredCourses.map((course) => (
            <div key={course._id} className="course-card">
              <h3>{course.name}</h3>
              <p><strong>Code:</strong> {course.code}</p>
              <p><strong>Unit:</strong> {course.unit ?? "N/A"}</p>
              <p><strong>Teacher:</strong> {course.teacher?.name || "N/A"}</p>
              <p><strong>Department:</strong> {course.department?.name || "-"}</p>
              <p><strong>Level:</strong> {course.level ?? "-"}</p>
              <p><strong>Semester:</strong> {course.semesterName ?? "-"}</p>

              {course.enrolled ? (
                <button className="enroll-btn enrolled" disabled>
                  Enrolled
                </button>
              ) : (
                <button
                  className={`enroll-btn ${loadingCourseId === course._id ? "loading" : ""}`}
                  onClick={() => handleEnroll(course._id)}
                  disabled={loadingCourseId === course._id}
                >
                  {loadingCourseId === course._id ? "Enrolling..." : "Enroll"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentCourses;
