// src/pages/AdminCourses.jsx
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../api/api";
import { Table, Button, Pagination, Form, Row, Col, Modal } from "react-bootstrap";
import "./AdminCourses.css";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";

const AdminCourses = () => {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [levels, setLevels] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    code: "",
    teacherId: "",
    department: "",
    level: "",
    totalClasses: 0,
    unit: 3,
  });
  const [editingId, setEditingId] = useState(null);
  const [enrollData, setEnrollData] = useState({ courseId: "", studentId: "" });
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const coursesPerPage = 10;

  // Filters / search
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterLevels, setFilterLevels] = useState([]);

  // Manage Students Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [modalEnrollStudent, setModalEnrollStudent] = useState("");

  // =============== FETCH DATA ===============
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, usersRes, deptRes] = await Promise.all([
          api.get("/courses"),
          api.get("/admin/users"),
          api.get("/departments"),
        ]);
        setCourses(coursesRes.data || []);
        const allUsers = usersRes.data?.users || [];
        setTeachers(allUsers.filter((u) => u.role === "teacher"));
        setStudents(allUsers.filter((u) => u.role === "student"));
        setDepartments(deptRes.data?.departments || deptRes.data || []);
      } catch (err) {
        toast.error("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // =============== FORM HANDLERS ===============
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "department") {
      const selectedDept = departments.find((d) => d._id === value);
      setLevels(selectedDept ? selectedDept.levels : []);
      setFormData((prev) => ({ ...prev, level: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const res = await api.put(`/courses/${editingId}`, formData);
        setCourses((prev) =>
          prev.map((c) => (c._id === editingId ? res.data.course : c))
        );
        toast.success("Course updated successfully");
      } else {
        const res = await api.post("/courses/create", formData);
        setCourses((prev) => [...prev, res.data.course]);
        toast.success("Course created successfully");
      }
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to save course");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      code: "",
      teacherId: "",
      department: "",
      level: "",
      totalClasses: 0,
      unit: 3,
    });
    setLevels([]);
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    try {
      await api.delete(`/courses/${id}`);
      setCourses((prev) => prev.filter((c) => c._id !== id));
      toast.success("Course deleted successfully");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleEdit = (course) => {
    setFormData({
      name: course.name,
      description: course.description,
      code: course.code,
      teacherId: course.teacher?._id || "",
      department: course.department?._id || course.department || "",
      level: course.level || "",
      totalClasses: course.totalClasses || 0,
      unit: course.unit || 3,
    });

    const selectedDept = departments.find(
      (d) => d._id === (course.department?._id || course.department)
    );
    setLevels(selectedDept ? selectedDept.levels : []);
    setEditingId(course._id);
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/courses/${enrollData.courseId}/enroll`, {
        studentId: enrollData.studentId,
      });
      toast.success(res.data.msg || "Student enrolled successfully");
      setEnrollData({ courseId: "", studentId: "" });
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to enroll student");
    }
  };

  // =============== FILTERING LOGIC ===============
  const handleDeptFilter = (e) => {
    const deptId = e.target.value;
    setFilterDept(deptId);
    const selectedDept = departments.find((d) => d._id === deptId);
    setFilterLevels(selectedDept ? selectedDept.levels : []);
    setFilterLevel("");
    setCurrentPage(1);
  };

  const filteredCourses = courses.filter((c) => {
    const search = searchTerm.trim().toLowerCase();
    const matchSearch =
      !search ||
      (c.name && c.name.toLowerCase().includes(search)) ||
      (c.code && c.code.toLowerCase().includes(search)) ||
      (c.teacher?.name && c.teacher.name.toLowerCase().includes(search));

    const matchDept = filterDept
      ? c.department?._id === filterDept || c.department === filterDept
      : true;
    const matchLevel = filterLevel
      ? String(c.level) === String(filterLevel)
      : true;

    return matchSearch && matchDept && matchLevel;
  });

  // =============== Manage Students Modal ===============
  // Open the modal for a specific course
  const openManageStudentsModal = async (course) => {
    try {
      const res = await api.get(`/courses/${course._id}`);
      setSelectedCourse(res.data.course || res.data);
      setModalEnrollStudent("");
      setShowModal(true);
    } catch (err) {
      toast.error("Failed to fetch course details");
    }
  };

  const handleModalEnroll = async (e) => {
    e.preventDefault();
    if (!modalEnrollStudent) return;
    try {
      await api.post(`/courses/${selectedCourse._id}/enroll`, {
        studentId: modalEnrollStudent,
      });
      toast.success("Student enrolled successfully");
      setCourses((prev) =>
        prev.map((c) =>
          c._id === selectedCourse._id
            ? {
              ...c,
              students: [
                ...(c.students || []),
                students.find((s) => s._id === modalEnrollStudent),
              ],
            }
            : c
        )
      );
      setModalEnrollStudent("");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to enroll student");
    }
  };

  const handleModalUnenroll = async (studentId) => {
    if (!window.confirm("Are you sure you want to unenroll this student?")) return;
    try {
      await api.post(`/courses/${selectedCourse._id}/unenroll`, { studentId });
      toast.success("Student unenrolled successfully");
      setCourses((prev) =>
        prev.map((c) =>
          c._id === selectedCourse._id
            ? {
              ...c,
              students: (c.students || []).filter((s) => s._id !== studentId),
            }
            : c
        )
      );
    } catch {
      toast.error("Failed to unenroll student");
    }
  };

  // Unassign a lecturer from a course
  const handleUnassignLecturer = async (courseId) => {
    if (!window.confirm("Are you sure you want to unassign this lecturer?")) return;
    try {
      const res = await api.post(`/courses/${courseId}/unassign-lecturer`);
      toast.success(res.data.msg || "Lecturer unassigned successfully");
      setCourses((prev) =>
        prev.map((c) =>
          c._id === courseId ? { ...c, teacher: null } : c
        )
      );
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to unassign lecturer");
    }
  };


  // Pagination
  const indexOfLastCourse = currentPage * coursesPerPage;
  const indexOfFirstCourse = indexOfLastCourse - coursesPerPage;
  const currentCourses = filteredCourses.slice(
    indexOfFirstCourse,
    indexOfLastCourse
  );
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-courses-page">
      <h2 className="admin-title">Manage Courses</h2>

      {/* Forms */}
      <div className="form-grid">
        <CourseForm
          formData={formData}
          teachers={teachers}
          departments={departments}
          levels={levels}
          editingId={editingId}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          resetForm={resetForm}
        />

        <EnrollmentForm
          courses={courses}
          students={students}
          enrollData={enrollData}
          setEnrollData={setEnrollData}
          handleEnroll={handleEnroll}
        />
      </div>

      {/* Filter Bar */}
      <div className="filter-bar glass-card mt-4 mb-3 p-3">
        <Row className="align-items-end g-2">
          <Col md={4}>
            <Form.Control
              type="text"
              placeholder="Search by name, code, or lecturer..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </Col>
          <Col md={3}>
            <Form.Select value={filterDept} onChange={handleDeptFilter}>
              <option value="">Filter by Department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Select
              value={filterLevel}
              onChange={(e) => {
                setFilterLevel(e.target.value);
                setCurrentPage(1);
              }}
              disabled={!filterLevels.length}
            >
              <option value="">Filter by Level</option>
              {filterLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl} Level
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={2} className="C-reset">
            <Button
              variant="secondary"
              className="w-100 b-tn"
              onClick={() => {
                setSearchTerm("");
                setFilterDept("");
                setFilterLevel("");
                setFilterLevels([]);
              }}
            >
              Reset
            </Button>
          </Col>
        </Row>
      </div>

      {/* Courses Table */}
      <CoursesTable
        courses={currentCourses}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        openManageStudentsModal={openManageStudentsModal}
        handleUnassignLecturer={handleUnassignLecturer}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination className="custom-pagination">
          <Pagination.Prev
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
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
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
          />
        </Pagination>
      )}

      {/* Manage Students Modal */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="lg"
        centered
        scrollable
      >
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fw-semibold">
            Manage Students for "{selectedCourse?.name}"
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <h5 className="mb-3 text-secondary">Enrolled Students</h5>

          {/* ✅ Responsive Table Wrapper */}
          <div className="table-responsive">
            <Table striped bordered hover className="align-middle">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Matric No.</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedCourse?.students?.length ? (
                  selectedCourse.students.map((s) => (
                    <tr key={s._id}>
                      <td>{s.name}</td>
                      <td>{s.studentId || "N/A"}</td>
                      <td className="text-center">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleModalUnenroll(s._id)}
                        >
                          Unenroll
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center text-muted">
                      No students enrolled
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          <hr />

          <Form onSubmit={handleModalEnroll} className="mt-3">
            <Row className="align-items-end g-2">
              <Col md={8} sm={12}>
                <Form.Select
                  value={modalEnrollStudent}
                  onChange={(e) => setModalEnrollStudent(e.target.value)}
                  required
                >
                  <option value="">Select Student to Enroll</option>
                  {students
                    .filter(
                      (s) =>
                        !(selectedCourse?.students || []).some(
                          (en) => en._id === s._id
                        )
                    )
                    .map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.studentId})
                      </option>
                    ))}
                </Form.Select>
              </Col>
              <Col md={4} sm={12}>
                <Button type="submit" className="w-100 btn-accent">
                  Enroll Student
                </Button>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
      </Modal>

    </div>
  );
};

/* -------------------------
   CourseForm component
   ------------------------- */
const CourseForm = ({
  formData,
  teachers,
  departments,
  levels,
  editingId,
  handleChange,
  handleSubmit,
  resetForm,
}) => (
  <form onSubmit={handleSubmit} className="admin-form">
    <h3>{editingId ? "Edit Course" : "Add New Course"}</h3>

    <input
      type="text"
      name="name"
      placeholder="Course Title"
      value={formData.name}
      onChange={handleChange}
      required
    />
    <textarea
      name="description"
      placeholder="Course Description"
      value={formData.description}
      onChange={handleChange}
    />
    <input
      type="text"
      name="code"
      placeholder="Course Code (e.g. CSC101)"
      value={formData.code}
      onChange={handleChange}
      required
    />
    <select
      name="teacherId"
      value={formData.teacherId}
      onChange={handleChange}
      required
    >
      <option value="">Select Lecturer</option>
      {teachers.map((t) => (
        <option key={t._id} value={t._id}>
          {t.name} ({t.email})
        </option>
      ))}
    </select>
    <select
      name="department"
      value={formData.department}
      onChange={handleChange}
      required
    >
      <option value="">Select Department</option>
      {departments.map((d) => (
        <option key={d._id} value={d._id}>
          {d.name}
        </option>
      ))}
    </select>
    <select
      name="level"
      value={formData.level}
      onChange={handleChange}
      required
      disabled={!levels.length}
    >
      <option value="">Select Level</option>
      {levels.map((lvl) => (
        <option key={lvl} value={lvl}>
          {lvl} Level
        </option>
      ))}
    </select>
    <input
      type="number"
      name="unit"
      placeholder="Course Unit"
      value={formData.unit}
      onChange={handleChange}
      min="1"
      max="6"
      required
    />
    <input
      type="number"
      name="totalClasses"
      placeholder="Total Classes"
      value={formData.totalClasses}
      onChange={handleChange}
      min="0"
    />

    <div className="form-actions">
      <Button type="submit" className="btn-primary">
        {editingId ? "Update Course" : "Create Course"}
      </Button>
      {editingId && (
        <Button
          variant="secondary"
          onClick={resetForm}
          className="btn-secondary ms-2"
        >
          Cancel
        </Button>
      )}
    </div>
  </form>
);

/* -------------------------
   EnrollmentForm component
   ------------------------- */
const EnrollmentForm = ({
  courses,
  students,
  enrollData,
  setEnrollData,
  handleEnroll,
}) => (
  <form onSubmit={handleEnroll} className="admin-form">
    <h3>Manually Enroll Student</h3>
    <select
      name="courseId"
      value={enrollData.courseId}
      onChange={(e) =>
        setEnrollData({ ...enrollData, courseId: e.target.value })
      }
      required
    >
      <option value="">Select Course</option>
      {courses.map((c) => (
        <option key={c._id} value={c._id}>
          {c.name} ({c.code})
        </option>
      ))}
    </select>
    <select
      name="studentId"
      value={enrollData.studentId}
      onChange={(e) =>
        setEnrollData({ ...enrollData, studentId: e.target.value })
      }
      required
    >
      <option value="">Select Student</option>
      {students.map((s) => (
        <option key={s._id} value={s._id}>
          {s.name} ({s.email})
        </option>
      ))}
    </select>
    <Button type="submit" className="btn-accent">
      Enroll Student
    </Button>
  </form>
);

/* -------------------------
   CoursesTable component
   ------------------------- */
const CoursesTable = ({ courses, handleEdit, handleDelete, openManageStudentsModal, handleUnassignLecturer }) => (
  <div className="table-container">
    <Table hover responsive className="admin-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Description</th>
          <th>Code</th>
          <th>Lecturer</th>
          <th>Department</th>
          <th>Level</th>
          <th>Unit</th>
          <th>Total Classes</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {courses.length > 0 ? (
          courses.map((c) => (
            <tr key={c._id}>
              <td>{c.name}</td>
              <td style={{ maxWidth: 220 }}>{c.description || "-"}</td>
              <td>{c.code}</td>
              <td>{c.teacher?.name || "N/A"}</td>
              <td>{c.department?.name || "N/A"}</td>
              <td>{c.level || "-"}</td>
              <td>{c.unit || "-"}</td>
              <td>{c.totalClasses || 0}</td>
              <td>
                <Button
                  variant="info"
                  size="sm"
                  onClick={() => openManageStudentsModal(c)}
                  className="me-2 mang"
                >
                  Manage
                </Button>
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => handleEdit(c)}
                  className="me-2"
                >
                  Edit
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleUnassignLecturer(c._id)}
                  className="me-2 unl"
                >
                  Unassign Lecturer
                </Button>


                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(c._id)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="9" className="text-center">
              No courses found
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  </div>
);

export default AdminCourses;
