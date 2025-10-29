// src/pages/AdminDepartments.jsx
import { useEffect, useState, useMemo } from "react";
import api from "../../api/api";
import { toast } from "react-toastify";
import { Table, Button, Pagination, Form } from "react-bootstrap";
import "./AdminDepartments.css";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";

const AdminDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDept, setNewDept] = useState({ name: "", levels: "" });
  const [editingDept, setEditingDept] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const departmentsPerPage = 10;

  // 🔹 Fetch all departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get("/departments");
        setDepartments(res.data);
      } catch (err) {
        console.error("Error fetching departments:", err);
        toast.error("Failed to load departments");
      } finally {
        setLoading(false);
      }
    };
    fetchDepartments();
  }, []);

  // 🔹 Add Department
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newDept.name.trim()) {
      toast.warning("Department name is required");
      return;
    }

    try {
      const payload = {
        name: newDept.name,
        levels: newDept.levels
          ? newDept.levels.split(",").map((l) => l.trim())
          : [],
      };
      const res = await api.post("/departments", payload);
      setDepartments([...departments, res.data]);
      setNewDept({ name: "", levels: "" });
      toast.success("Department created");
    } catch (err) {
      console.error("Failed to add department:", err);
      toast.error("Error creating department");
    }
  };

  // 🔹 Update Department
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingDept.name.trim()) {
      toast.warning("Department name is required");
      return;
    }

    try {
      const payload = {
        name: editingDept.name,
        levels: editingDept.levels
          ? editingDept.levels.split(",").map((l) => l.trim())
          : [],
      };
      const res = await api.put(`/departments/${editingDept._id}`, payload);
      setDepartments((prev) =>
        prev.map((d) => (d._id === editingDept._id ? res.data : d))
      );
      setEditingDept(null);
      toast.success("Department updated");
    } catch (err) {
      console.error("Failed to update department:", err);
      toast.error("Error updating department");
    }
  };

  // 🔹 Delete Department
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department?"))
      return;

    try {
      await api.delete(`/departments/${id}`);
      setDepartments((prev) => prev.filter((d) => d._id !== id));
      toast.success("Department deleted");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete department");
    }
  };

  // 🔹 Filter departments by search query
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [departments, searchQuery]);

  // 🔹 Pagination
  const indexOfLastDept = currentPage * departmentsPerPage;
  const indexOfFirstDept = indexOfLastDept - departmentsPerPage;
  const currentDepartments = filteredDepartments.slice(
    indexOfFirstDept,
    indexOfLastDept
  );
  const totalPages = Math.ceil(filteredDepartments.length / departmentsPerPage);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-dept-container">
      <h2 className="dept-title">Manage Departments</h2>

      {/* 🔹 Add / Edit Department Form */}
      <form
        onSubmit={editingDept ? handleUpdate : handleAdd}
        className="dept-form"
      >
        <input
          type="text"
          placeholder="Department name"
          value={editingDept ? editingDept.name : newDept.name}
          onChange={(e) =>
            editingDept
              ? setEditingDept({ ...editingDept, name: e.target.value })
              : setNewDept({ ...newDept, name: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Levels (comma-separated e.g. 100,200,300)"
          value={editingDept ? editingDept.levels : newDept.levels}
          onChange={(e) =>
            editingDept
              ? setEditingDept({ ...editingDept, levels: e.target.value })
              : setNewDept({ ...newDept, levels: e.target.value })
          }
        />

        <div className="dept-btns">
          <Button type="submit" className="add-btn">
            {editingDept ? "Update" : "Add"}
          </Button>
          {editingDept && (
            <Button
              variant="secondary"
              className="cancel-btn"
              onClick={() => setEditingDept(null)}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* 🔹 Search Bar */}
      <div className="dept-search-bar mb-3">
        <Form.Control
          type="text"
          placeholder="Search departments..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* 🔹 Table */}
      <div className="dept-table-wrapper">
        <Table striped bordered hover responsive className="dept-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Levels</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentDepartments.length > 0 ? (
              currentDepartments.map((d) => (
                <tr key={d._id}>
                  <td>{d.name}</td>
                  <td>{d.levels?.join(", ") || "N/A"}</td>
                  <td>
                    <Button
                      className="edit-btn"
                      size="sm"
                      onClick={() =>
                        setEditingDept({
                          ...d,
                          levels: d.levels?.join(", ") || "",
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      className="delete-btn"
                      size="sm"
                      onClick={() => handleDelete(d._id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="text-center">
                  No departments found
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* 🔹 Pagination */}
      {totalPages > 1 && (
        <div className="dept-pagination">
          <Pagination>
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
        </div>
      )}
    </div>
  );
};

export default AdminDepartments;
