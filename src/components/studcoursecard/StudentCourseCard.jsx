import { useNavigate } from "react-router-dom";
import { Card, Badge } from "react-bootstrap";
import { FaBookOpen } from "react-icons/fa";
import { getRank } from "../../utils/getRank";
import { FaChalkboardTeacher } from "react-icons/fa";
import "./studentCourseCard.css";

const StudentCourseCard = ({ course, summary }) => {
  const navigate = useNavigate();
  const handleClick = () => navigate(`/student/courses/${course._id}`);

  const classesHeld = summary?.classesHeld || 0;
  const totalPlanned = summary?.totalPlanned || course?.totalClasses || 0;
  const present = summary?.present || 0;
  const absent = summary?.absent || 0;
  const attendancePercentage = summary?.attendancePercentage ?? 0;
  const xpScore = summary?.score ?? 0;

  const rank = getRank(present, totalPlanned);

  const formatXP = (num) => num.toFixed(2);
  const formatPercentage = (num) =>
    Number.isInteger(num) ? num : num.toFixed(1);

  return (
    <Card className="course-card shadow-sm" onClick={handleClick}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="d-flex align-items-center gap-2">
            <div className="course-icon">
              <FaBookOpen />
            </div>
            <h6 className="fw-bold mb-0 text-dark">{course.code}</h6>

            {course.hasActiveSession && (
              <div bg="danger" className="live-badge ms-2">
                ● ACTIVE
              </div>
            )}
          </div>

          <div className="units-badges">
            {course.unit || 3} Units
          </div>
        </div>


        <Card.Title className="fw-semibold">{course.name}</Card.Title>
        <Card.Text className="text-muted small mb-3">
          {course.description || "No description available"}
        </Card.Text>

        <div className="lecturer-row">

          <div className="lecturer-avatar">
            <FaChalkboardTeacher />
          </div>

          <div className="lecturer-info">
            <small>Course Lecturer</small>
            <strong>{course.teacher?.name || "Not Assigned"}</strong>
          </div>

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
            <div className="attendance-circle-wrapper">

              <div
                className="attendance-circle"
                style={{
                  "--percentage": attendancePercentage
                }}
              >

                <div className="attendance-circle-inner">

                  <strong>
                    {formatPercentage(attendancePercentage)}%
                  </strong>

                  <small>Attendance</small>

                </div>

              </div>

            </div>

            {rank && (
              <div className="rank-badge">

                <img
                  src={rank.img}
                  alt={rank.name}
                  className="rank-img"
                />

                <div className="rank-content">

                  <span className="rank-title">
                    {rank.name}
                  </span>

                  <small>
                    {formatXP(xpScore)} XP Earned
                  </small>

                </div>

                <div className="rank-arrow">

                  →

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