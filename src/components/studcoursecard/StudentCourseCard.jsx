import { useNavigate } from "react-router-dom";
import { Card, Badge } from "react-bootstrap";
import { FaBookOpen } from "react-icons/fa";
import { getRank } from "../../utils/getRank";
import "./studentCourseCard.css";

const StudentCourseCard = ({ course, summary }) => {
  const navigate = useNavigate();
  const handleClick = () => navigate(`/student/courses/${course._id}`);

  const classesHeld = summary?.classesHeld || 0;
  const totalPlanned = summary?.totalPlanned || course?.totalClasses || 0;
  const present = summary?.present || 0;
  const absent = summary?.absent || 0;
  const attendancePercentage =
    summary?.attendancePercentage ||
    (classesHeld > 0 ? (present / classesHeld) * 100 : 0);
  const xpScore = totalPlanned > 0 ? present / totalPlanned : 0;
  const rank = getRank(present, totalPlanned);

  const formatXP = (num) => num.toFixed(2);
  const formatPercentage = (num) =>
    Number.isInteger(num) ? num : num.toFixed(1);

  return (
    <Card className="course-card shadow-sm" onClick={handleClick}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="d-flex align-items-center gap-2">
            <FaBookOpen className="text-success" size={20} />
            <h6 className="fw-bold mb-0 text-dark">{course.code}</h6>
          </div>
          <Badge bg="success-subtle" text="success">
            {course.unit || 3} Units
          </Badge>
        </div>

        <Card.Title className="fw-semibold">{course.name}</Card.Title>
        <Card.Text className="text-muted small mb-3">
          {course.description || "No description available"}
        </Card.Text>

        <div className="text-muted small mb-2">
          <strong>Lecturer:</strong> {course.teacher?.name || "N/A"}
        </div>

        {summary ? (
          <div className="attendance-info mt-2">
            <div className="d-flex justify-content-between small text-muted">
              <span>Present:</span>
              <span>{present}</span>
            </div>
            <div className="d-flex justify-content-between small text-muted">
              <span>Absent:</span>
              <span>{absent}</span>
            </div>
            <div className="d-flex justify-content-between fw-semibold">
              <span>Attendance:</span>
              <span className="text-success">
                {formatPercentage(attendancePercentage)}%
              </span>
            </div>

            {rank && (
              <div className="rank-badge d-flex align-items-center mt-3">
                <img
                  src={rank.img}
                  alt={rank.name}
                  className="rank-img me-2"
                />
                <div>
                  <span className="fw-bold">{rank.name}</span>
                  <br />
                  <small className="text-muted">
                    Score: {formatXP(xpScore)} XP
                  </small>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted small fst-italic mt-3">
            No attendance records yet.
          </p>
        )}
      </Card.Body>
    </Card>
  );
};

export default StudentCourseCard;
