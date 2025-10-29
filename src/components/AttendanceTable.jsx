import { useEffect, useState, useMemo } from "react";
import API from "../api/api";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AttendanceTable = ({ courseId, students }) => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // number of students per page

  useEffect(() => {
    fetchAttendance();
    setCurrentPage(1); // reset to first page if course changes
  }, [courseId]);

  const fetchAttendance = async () => {
    try {
      const res = await API.get(`/attendance/${courseId}`);
      setAttendanceRecords(res.data.records);
    } catch (err) {
      toast.error("Failed to fetch attendance records");
      console.error(err);
    }
  };

  const markAttendance = async (studentId) => {
    try {
      await API.post(`/attendance/${courseId}/mark/${studentId}`);
      fetchAttendance();
      toast.success("Attendance marked successfully!");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to mark attendance");
    }
  };

  const totalPages = Math.ceil(students.length / pageSize);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return students.slice(start, start + pageSize);
  }, [students, currentPage]);

  return (
    <div>
      <table className="w-full border-collapse border border-gray-300 mt-4">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Student</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {paginatedStudents.map((s) => {
            const record = attendanceRecords.find((r) => r.student._id === s._id);
            return (
              <tr key={s._id} className="hover:bg-gray-50">
                <td className="border p-2">{s.name}</td>
                <td className="border p-2">{s.email}</td>
                <td className="border p-2">
                  {record ? (
                    <span className="text-green-600 font-medium">{record.status}</span>
                  ) : (
                    <span className="text-red-500 font-medium">Absent</span>
                  )}
                </td>
                <td className="border p-2 text-center">
                  {!record && (
                    <button
                      onClick={() => markAttendance(s._id)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Mark Present
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-4 gap-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AttendanceTable;
