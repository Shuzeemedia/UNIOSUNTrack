// src/components/CourseCard.jsx
import { useNavigate } from "react-router-dom";

const CourseCard = ({ course }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/courses/${course._id}`);
  };

  return (
    <div
      className="course-card border p-4 rounded shadow hover:shadow-lg cursor-pointer transition"
      onClick={handleClick}
    >
      <h3 className="text-lg font-bold">{course.name}</h3>
      <p className="text-gray-600">Teacher: {course.teacherName}</p>
    </div>
  );
};

export default CourseCard;
