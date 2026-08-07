import {
    FaCalendarDay,
    FaCalendarWeek,
    FaCalendarAlt,
    FaChartLine,
} from "react-icons/fa";

const AttendanceHeader = ({ filter }) => {
    const getHeader = () => {
        switch (filter) {
            case "today":
                return {
                    title: "Today's Attendance",
                    subtitle: "Attendance records captured for today.",
                    icon: <FaCalendarDay />,
                };

            case "week":
                return {
                    title: "This Week",
                    subtitle: "Your attendance performance this week.",
                    icon: <FaCalendarWeek />,
                };

            case "month":
                return {
                    title: "This Month",
                    subtitle: "Attendance overview for the current month.",
                    icon: <FaCalendarAlt />,
                };

            default:
                return {
                    title: "Attendance Overview",
                    subtitle: "View and monitor your attendance records.",
                    icon: <FaChartLine />,
                };
        }
    };

    const header = getHeader();

    return (
        <div className="attendance-header-card">
            <div className="attendance-header-icon">
                {header.icon}
            </div>

            <div>
                <h4>{header.title}</h4>
                <p>{header.subtitle}</p>
            </div>
        </div>
    );
};

export default AttendanceHeader;