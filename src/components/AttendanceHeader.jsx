// src/components/AttendanceHeader.jsx
const AttendanceHeader = ({ filter }) => {
    const getHeaderText = () => {
        switch (filter) {
            case "today":
                return "Attendance Summary - Today";
            case "week":
                return "Attendance Summary - This Week";
            case "month":
                return "Attendance Summary - This Month";
            default:
                return "Attendance Summary";
        }
    };

    return <h3 className="text-xl font-semibold my-2">{getHeaderText()}</h3>;
};

export default AttendanceHeader;
