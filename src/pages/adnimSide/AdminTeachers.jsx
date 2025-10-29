// src/pages/AdminTeachers.jsx
import { useEffect, useState, useMemo } from "react";
import api from "../../api/api";
import { toast } from "react-toastify";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import { Pagination, Table, Button, Form, Row, Col } from "react-bootstrap";
import "./adminTeachers.css";

const AdminTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    departmentId: "",
  });

  // filters
  const [selectedDept, setSelectedDept] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const teachersPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teacherRes, deptRes] = await Promise.all([
          api.get("/admin/teachers"),
          api.get("/departments"),
        ]);
        setTeachers(teacherRes.data.users || []);
        setDepartments(deptRes.data || []);
      } catch (err) {
        console.error("Error fetching data:", err);
        toast.error("Failed to fetch teachers or departments");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.departmentId) {
      toast.error("Please select a department");
      return;
    }

    try {
      const res = await api.post("/admin/create-teacher", formData);
      toast.success(res.data.msg || "Teacher created successfully");
      if (res.data.generatedPassword) {
        toast.info(`Temp Password: ${res.data.generatedPassword}`);
      }

      setFormData({ name: "", email: "", departmentId: "" });
      if (res.data.user) {
        setTeachers((prev) => [...prev, res.data.user]);
      }
    } catch (err) {
      console.error("Error creating teacher:", err);
      toast.error(err.response?.data?.msg || "Failed to create teacher");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this teacher?")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setTeachers((prev) => prev.filter((t) => t._id !== id));
      toast.success("Teacher deleted successfully");
    } catch (err) {
      console.error("Error deleting teacher:", err);
      toast.error("Failed to delete teacher");
    }
  };

  const handleDeptChange = async (teacherId, newDeptId) => {
    try {
      const res = await api.put(`/admin/teachers/${teacherId}/department`, {
        departmentId: newDeptId,
      });
      toast.success("Department updated");
      setTeachers((prev) =>
        prev.map((teacher) =>
          teacher._id === teacherId ? res.data.user : teacher
        )
      );
    } catch (err) {
      console.error("Error updating department:", err);
      toast.error("Failed to update department");
    }
  };

  // --- Filtered teachers based on search and department ---
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchDept = selectedDept ? t.department?._id === selectedDept : true;
      const matchSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [teachers, selectedDept, searchQuery]);

  // pagination
  const indexOfLastTeacher = currentPage * teachersPerPage;
  const indexOfFirstTeacher = indexOfLastTeacher - teachersPerPage;
  const currentTeachers = filteredTeachers.slice(indexOfFirstTeacher, indexOfLastTeacher);
  const totalPages = Math.ceil(filteredTeachers.length / teachersPerPage);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-teachers-page">
      <h2 className="page-title">Manage Lecturers</h2>

      {/* ---- CREATE LECTURER FORM ---- */}
      <div className="teacher-form-card">
        <h3>Add New Lecturer</h3>
        <form onSubmit={handleSubmit} className="teacher-form">
          <Form.Control
            type="text"
            name="name"
            placeholder="Lecturer Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <Form.Control
            type="email"
            name="email"
            placeholder="Lecturer Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <Form.Select
            name="departmentId"
            value={formData.departmentId}
            onChange={handleChange}
            required
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </Form.Select>

          <Button type="submit" className="btn-create">
            Create Lecturer
          </Button>
        </form>
      </div>

      {/* ---- FILTER BAR ---- */}
      <div className="teacher-filter-bar mb-3">
        <Row className="align-items-center g-2">
          <Col md={4} sm={12}>
            <Form.Select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={4} sm={12}>
            <Form.Control
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </Col>
        </Row>
      </div>

      {/* ---- TEACHER TABLE ---- */}
      <div className="teacher-table-wrapper">
        <Table striped bordered hover responsive className="teacher-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentTeachers.length > 0 ? (
              currentTeachers.map((t) => (
                <tr key={t._id}>
                  <td>{t.name}</td>
                  <td>{t.email}</td>
                  <td>
                    <Form.Select
                      size="sm"
                      value={t.department?._id || ""}
                      onChange={(e) => handleDeptChange(t._id, e.target.value)}
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name}
                        </option>
                      ))}
                    </Form.Select>
                  </td>
                  <td>
                    <Button
                      className="delt"
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(t._id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center">
                  No Lecturers found
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* ---- PAGINATION ---- */}
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

export default AdminTeachers;
