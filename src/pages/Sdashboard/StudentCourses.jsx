import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import { AuthContext } from "../../context/AuthContext";
import "./studentCourses.css";

const StudentCourses = () => {
    const { user } = useContext(AuthContext);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

    // Helper: safely get department ID
    const getDepartmentId = (dept) => {
        if (!dept) return null;
        if (typeof dept === "string") return dept;
        if (dept._id) return dept._id;
        if (dept.department && dept.department._id) return dept.department._id;
        return null;
    };

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return toast.error("Please log in first.");

                const res = await axios.get(`${API_BASE_URL}/courses/available`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                // Mark courses as enrolled if the current user is in the students array
                const coursesWithEnroll = res.data.map((c) => ({
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


    const handleEnroll = async (courseId) => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${API_BASE_URL}/courses/${courseId}/self-enroll`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success(res.data.msg || "Enrolled successfully!");
            setCourses((prev) =>
                prev.map((c) => (c._id === courseId ? { ...c, enrolled: true } : c))
            );
        } catch (err) {
            console.error("Enroll error:", err);
            toast.error(err.response?.data?.msg || "Failed to enroll.");
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="student-courses-container">
            <h2>Available Courses</h2>
            {courses.length === 0 ? (
                <p>No courses available for your department and level.</p>
            ) : (
                <div className="course-list">
                    {courses.map((course) => (
                        <div key={course._id} className="course-card">
                            <h3>{course.name}</h3>
                            <p><strong>Code:</strong> {course.code}</p>
                            <p><strong>Unit:</strong> {course.unit ?? "N/A"}</p>
                            <p><strong>Teacher:</strong> {course.teacher?.name || "N/A"}</p>
                            <button className="enroll-btn" onClick={() => handleEnroll(course._id)}>
                                Enroll
                            </button>


                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentCourses;
