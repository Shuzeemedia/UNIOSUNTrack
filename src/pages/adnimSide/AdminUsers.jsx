// src/pages/AdminUsers.jsx
import { useEffect, useState } from "react";
import api from "../../api/api";
import { toast } from "react-toastify";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import { Pagination, Table, Button, Form } from "react-bootstrap";
import "./adminUsers.css"; // ✅ new CSS file

const AdminUsers = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 10;

  // Fetch all students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.get("/admin/students");
        setStudents(res.data.users || []);
      } catch (err) {
        console.error("Error fetching students:", err);
        toast.error("Failed to fetch students");
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // Delete student
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setStudents((prev) => prev.filter((s) => s._id !== id));
      toast.success("Student deleted successfully");
    } catch (err) {
      console.error("Error deleting student:", err);
      toast.error("Failed to delete student");
    }
  };

  // Apply filters
  const filteredStudents = students.filter((s) => {
    const deptName = s.department?.name || "N/A";
    const level = s.level ? String(s.level) : "N/A";

    const deptMatch = deptFilter ? deptName === deptFilter : true;
    const levelMatch = levelFilter ? level === levelFilter : true;

    return deptMatch && levelMatch;
  });

  // Pagination
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(
    indexOfFirstStudent,
    indexOfLastStudent
  );
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  // Unique filter options
  const deptOptions = [
    ...new Set(students.map((s) => s.department?.name || "N/A")),
  ];
  const levelOptions = [
    ...new Set(students.map((s) => (s.level ? String(s.level) : "N/A"))),
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-users-page">
      <h2 className="page-title">Manage Students</h2>

      {/* Filters */}
      <div className="filter-bar">
        <Form.Select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">All Departments</option>
          {deptOptions.map((dept, idx) => (
            <option key={idx} value={dept}>
              {dept}
            </option>
          ))}
        </Form.Select>

        <Form.Select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">All Levels</option>
          {levelOptions.map((level, idx) => (
            <option key={idx} value={level}>
              {level}
            </option>
          ))}
        </Form.Select>
      </div>

      {/* Students Table */}
      <div className="user-table-wrapper">
        <Table striped bordered hover responsive className="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Level</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentStudents.length > 0 ? (
              currentStudents.map((s) => (
                <tr key={s._id}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.department?.name || "N/A"}</td>
                  <td>{s.level ? String(s.level) : "N/A"}</td>
                  <td>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(s._id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center">
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination className="pagination-controls">
          <Pagination.Prev
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          />
          {Array.from({ length: totalPages }, (_, idx) => (
            <Pagination.Item
              key={idx + 1}
              active={currentPage === idx + 1}
              onClick={() => setCurrentPage(idx + 1)}
            >
              {idx + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          />
        </Pagination>
      )}
    </div>
  );
};

export default AdminUsers;
