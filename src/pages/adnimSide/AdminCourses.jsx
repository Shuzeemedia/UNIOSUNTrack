// src/pages/AdminCourses.jsx
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../api/api";
import { Table, Button, Pagination, Form, Row, Col, Modal } from "react-bootstrap";
import "./AdminCourses.css";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import SemesterForm from "../adnimSide/SemesterForm";

const AdminCourses = () => {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [levels, setLevels] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    code: "",
    teacherId: "",
    department: "",
    level: "",
    totalClasses: 0,
    unit: 3,
    semesterId: "",
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
  const [filterSemester, setFilterSemester] = useState("");
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [editingSemester, setEditingSemester] = useState(null);


  // Manage Students Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [modalEnrollStudent, setModalEnrollStudent] = useState("");

  // Fetch function
  const fetchData = async () => {
    try {
      setLoading(true);

      const [coursesRes, usersRes, deptRes, semestersRes] = await Promise.all([
        api.get("/courses"),
        api.get("/admin/users"),
        api.get("/departments"),
        api.get("/semesters")
      ]);
      console.log("SEMESTERS RESPONSE:", semestersRes.data);


      const normalizedCourses = (coursesRes.data || []).map(c => ({
        ...c,
        semester: typeof c.semester === "object" ? c.semester._id : c.semester
      }));

      setCourses(normalizedCourses);



      const allUsers = usersRes.data?.users || [];
      setTeachers(allUsers.filter((u) => u.role === "teacher"));
      setStudents(allUsers.filter((u) => u.role === "student"));

      setDepartments(deptRes.data?.departments || deptRes.data || []);

      // The correct one
      setSemesters(semestersRes.data.semesters || semestersRes.data || []);


    } catch (err) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };


  // Call it on mount
  useEffect(() => {
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
      // Find the selected semester object from semesters array
      const selectedSemester = semesters.find(s => s._id === formData.semesterId);

      if (!selectedSemester) {
        toast.error("Please select a valid semester");
        return;
      }

      // Prepare payload using semester _id
      const payload = {
        ...formData,
        semester: selectedSemester._id, // send ObjectId
      };

      if (editingId) {
        await api.put(`/courses/${editingId}`, payload);
        toast.success("Course updated successfully");
      } else {
        await api.post("/courses/create", payload);
        toast.success("Course created successfully");
      }

      resetForm();
      fetchData();
    } catch (err) {
      console.error("Course save error:", err.response || err);
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
      semesterId: "",
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
      semesterId: course.semesterId || course.semester || "",
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
    const matchSemester = filterSemester
      ? String(c.semester) === String(filterSemester)
      : true;



    return matchSearch && matchDept && matchLevel && matchSemester;
  });

  // =============== Manage Students Modal ===============
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
    if (!modalEnrollStudent) return toast.error("Please select a student");

    try {
      await api.post(`/courses/${selectedCourse._id}/enroll`, {
        studentId: modalEnrollStudent,
      });

      const enrolledStudent = students.find((s) => s._id === modalEnrollStudent);

      toast.success("Student enrolled successfully");

      setCourses((prev) =>
        prev.map((c) =>
          c._id === selectedCourse._id
            ? { ...c, students: [...(c.students || []), enrolledStudent] }
            : c
        )
      );

      setSelectedCourse((prev) => ({
        ...prev,
        students: [...(prev.students || []), enrolledStudent],
      }));

      setModalEnrollStudent("");
    } catch (err) {
      console.error("Enroll failed:", err);
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
            ? { ...c, students: (c.students || []).filter((s) => s._id !== studentId) }
            : c
        )
      );

      setSelectedCourse((prev) => ({
        ...prev,
        students: (prev.students || []).filter((s) => s._id !== studentId),
      }));
    } catch (err) {
      console.error("Unenroll failed:", err);
      toast.error("Failed to unenroll student");
    }
  };

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
  const currentCourses = filteredCourses.slice(indexOfFirstCourse, indexOfLastCourse);
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-courses-page">
      <h2 className="admin-title">Manage Courses</h2>

      {/* --- Add Semester Button --- */}
      <div className="mb-3">
        <Button
          variant="primary"
          onClick={() => { setEditingSemester(null); setShowSemesterModal(true); }}
        >
          Add Semester
        </Button>
      </div>

      {/* Forms */}
      <div className="form-grid">
        <CourseForm
          formData={formData}
          setFormData={setFormData}
          teachers={teachers}
          departments={departments}
          levels={levels}
          editingId={editingId}
          semesters={semesters}
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
          <Col md={3}>
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
          <Col md={2}>
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
          <Col md={2}>
            <Form.Select
              value={filterSemester}
              onChange={(e) => {
                setFilterSemester(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Filter by Semester</option>
              {semesters.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.season})
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
                setFilterSemester("");
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
        semesters={semesters}
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
      <ManageStudentsModal
        show={showModal}
        onHide={() => setShowModal(false)}
        course={selectedCourse}
        students={students}
        handleModalEnroll={handleModalEnroll}
        modalEnrollStudent={modalEnrollStudent}
        setModalEnrollStudent={setModalEnrollStudent}
        handleModalUnenroll={handleModalUnenroll}
      />

      {/* Semester Modal */}
      <SemesterForm
        show={showSemesterModal}
        onHide={() => setShowSemesterModal(false)}
        fetchSemesters={fetchData} // use your existing fetchData function
        editingSemester={editingSemester}
      />

    </div>
  );
};

/* -------------------------
   CourseForm component
   ------------------------- */
const CourseForm = ({
  formData,
  setFormData,
  teachers,
  departments,
  levels,
  semesters,
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

    {/* Semester Selection */}
    <select
      name="semesterId"
      value={formData.semesterId} // <-- store _id
      onChange={handleChange} // simple generic handler
      required
    >
      <option value="">Select Semester</option>
      {semesters.map((s) => (
        <option key={s._id} value={s._id}>
          {s.name} ({s.season})
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
          {s.name} ({s.studentId})
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
const CoursesTable = ({
  courses,
  semesters, // <-- receive semesters here
  handleEdit,
  handleDelete,
  openManageStudentsModal,
  handleUnassignLecturer,
}) => (
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
          <th>Semester</th>
          <th>Unit</th>
          <th>Total Classes</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {courses.length > 0 ? (
          courses.map((c) => {
            const semesterObj = semesters.find(s => s._id === (c.semesterId || c.semester));

            return (
              <tr key={c._id}>
                <td>{c.name}</td>
                <td style={{ maxWidth: 220 }}>{c.description || "-"}</td>
                <td>{c.code}</td>
                <td>{c.teacher?.name || "N/A"}</td>
                <td>{c.department?.name || "N/A"}</td>
                <td>{c.level || "-"}</td>
                <td>{semesterObj ? `${semesterObj.name} (${semesterObj.season})` : "-"}</td> {/* ✅ display semester */}
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
            );
          })
        ) : (
          <tr>
            <td colSpan="10" className="text-center">
              No courses found
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  </div>
);


/* -------------------------
   ManageStudentsModal component
   ------------------------- */
const ManageStudentsModal = ({
  show,
  onHide,
  course,
  students,
  handleModalEnroll,
  modalEnrollStudent,
  setModalEnrollStudent,
  handleModalUnenroll,
}) => (
  <Modal show={show} onHide={onHide} size="lg" centered>
    <Modal.Header closeButton>
      <Modal.Title>Manage Students: {course?.name}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <form onSubmit={handleModalEnroll} className="mb-3 d-flex gap-2">
        <select
          value={modalEnrollStudent}
          onChange={(e) => setModalEnrollStudent(e.target.value)}
          className="form-select"
          required
        >
          <option value="">Select Student to Enroll</option>
          {students
            .filter((s) => !(course?.students || []).some((cs) => cs._id === s._id))
            .map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.studentId})
              </option>
            ))}
        </select>
        <Button type="submit" variant="primary">
          Enroll
        </Button>
      </form>
      <h5>Enrolled Students</h5>
      <ul>
        {(course?.students || []).map((s) => (
          <li key={s._id} className="d-flex justify-content-between">
            {s.name} ({s.studentId})
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleModalUnenroll(s._id)}
            >
              Unenroll
            </Button>
          </li>
        ))}
      </ul>
    </Modal.Body>
  </Modal>
);

export default AdminCourses;