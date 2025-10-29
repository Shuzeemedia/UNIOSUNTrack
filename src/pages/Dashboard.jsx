import { useEffect, useState, useContext } from "react";
import API from "../api/api";
import { AuthContext } from "../context/AuthContext";
import CourseCard from "../components/CourseCard";

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.role === "teacher") {
      fetchCourses();
    }
  }, [user]);

  const fetchCourses = async () => {
    try {
      const res = await API.get("/courses/my-courses"); // backend route to fetch teacher's courses
      setCourses(res.data || []);
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to fetch courses");
    }
  };

  return (
    <div className="dashboard-container">
      <h1>Welcome, {user?.name}</h1>
      <h2>Your Courses</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div className="courses-grid">
        {courses.length === 0 ? (
          <p>No courses assigned yet.</p>
        ) : (
          courses.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;
