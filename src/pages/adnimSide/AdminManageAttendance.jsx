import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toast } from "react-toastify";
import { Pagination, Table, Button } from "react-bootstrap";
import { getRank } from "../../utils/getRank";
import "./adminManageAttendance.css";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";

const API_BASE = "http://localhost:5000/api";

const toDateKey = (d) => {
  // produce a local YYYY-MM-DD string (avoids timezone shifts from toISOString)
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const AdminManageAttendance = () => {
  // --- STATES ---
  const [student, setStudent] = useState("");
  const [course, setCourse] = useState("");
  const [status, setStatus] = useState("Present");
  const [date, setDate] = useState("");
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [editId, setEditId] = useState(null);

  // Filters
  const [filterStudent, setFilterStudent] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [search, setSearch] = useState("");

  const [calendarDate, setCalendarDate] = useState(null); // used for month/year view + selected day
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const token = () => localStorage.getItem("token");

  // --- FETCH FUNCTIONS ---
  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/attendance`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        // API returns { records } per your route — support both shapes
        setRecords(Array.isArray(data.records) ? data.records : data);
      } else {
        setServerError("Failed to fetch attendance");
        toast.error("Failed to fetch attendance");
      }
    } catch (err) {
      setServerError("Failed to fetch attendance.");
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const t = token();
      if (!t) return;
      const [studentsRes, coursesRes] = await Promise.all([
        fetch(`${API_BASE}/admin/students`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API_BASE}/admin/courses`, { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      const studentsData = await studentsRes.json();
      const coursesData = await coursesRes.json();
      setStudents(studentsData.users || []);
      setCourses(coursesData.courses || []);
    } catch {
      toast.error("Error fetching students/courses");
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- FORM SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    const t = token();
    if (!student || !course || !status) return toast.error("Select all fields");

    let payload = editId
      ? { status, ...(date && { date: new Date(date).toISOString() }) }
      : { studentId: student, courseId: course, status, ...(date && { date: new Date(date).toISOString() }) };

    try {
      const url = editId ? `${API_BASE}/attendance/${editId}` : `${API_BASE}/attendance`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed");
      await fetchRecords();
      setStudent("");
      setCourse("");
      setStatus("Present");
      setDate("");
      setEditId(null);
      toast.success(editId ? "Attendance updated" : "Attendance added");
    } catch {
      toast.error("Save failed");
    }
  };

  // --- FILTER + SUMMARY + PAGINATION ---
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterStudent && r.student?._id !== filterStudent) return false;
      if (filterCourse && r.course?._id !== filterCourse) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterFrom && new Date(r.date) < new Date(filterFrom)) return false;
      if (filterTo && new Date(r.date) > new Date(filterTo)) return false;
      if (calendarDate && new Date(r.date).toDateString() !== new Date(calendarDate).toDateString()) return false;
      if (search && !(`${r.student?.name || ""} ${r.course?.name || ""}`.toLowerCase().includes(search.toLowerCase())))
        return false;
      return true;
    });
  }, [records, filterStudent, filterCourse, filterStatus, filterFrom, filterTo, calendarDate, search]);

  const groupedSummary = useMemo(() => {
    const map = {};
    filteredRecords.forEach((r) => {
      const key = `${r.student?._id}-${r.course?._id}`;
      if (!map[key]) map[key] = { student: r.student, course: r.course, present: 0, absent: 0 };
      r.status === "Present" ? map[key].present++ : map[key].absent++;
    });
    return Object.values(map);
  }, [filteredRecords]);

  const totalPages = Math.ceil(groupedSummary.length / recordsPerPage);
  const currentSummaries = groupedSummary.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

  // --- Calendar data prep (use local-date keys to avoid timezone issues)
  // Respect currently applied student/course filters for calendar highlighting:
  const visibleRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterStudent && r.student?._id !== filterStudent) return false;
      if (filterCourse && r.course?._id !== filterCourse) return false;
      return true;
    });
  }, [records, filterStudent, filterCourse]);

  const { presentSet, absentSet } = useMemo(() => {
    const p = new Set();
    const a = new Set();
    visibleRecords.forEach((r) => {
      if (!r.date) return;
      const key = toDateKey(r.date);
      if (r.status === "Present") p.add(key);
      else if (r.status === "Absent") a.add(key);
    });
    return { presentSet: p, absentSet: a };
  }, [visibleRecords]);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      groupedSummary.map((s) => ({
        Student: s.student?.name || "N/A",
        Course: s.course?.name || "N/A",
        Present: s.present,
        Absent: s.absent,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout]), "attendance.xlsx");
    toast.info("Exported to Excel");
  };

  // helper to navigate months in custom calendar
  const moveMonth = (delta) => {
    const base = calendarDate ? new Date(calendarDate) : new Date();
    const newDate = new Date(base.getFullYear(), base.getMonth() + delta, 1);
    setCalendarDate(newDate);
  };

  if (loading)
    return <LoadingSpinner />;


  return (
    <div className="admin-attendance-container">
      <h2 className="page-title">Manage Attendance</h2>
      {serverError && <p className="error-text">{serverError}</p>}

      {/* FORM */}
      <h2 className="page-title">Mark Attendance</h2>
      <form onSubmit={handleSubmit} className="attendance-form">
        <select value={student} onChange={(e) => setStudent(e.target.value)} required disabled={!!editId}>
          <option value="">Select Student</option>
          {students.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>

        <select value={course} onChange={(e) => setCourse(e.target.value)} required disabled={!!editId}>
          <option value="">Select Course</option>
          {courses.map((c) => (
            <option key={c._id} value={c._1d ?? c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Present">Present</option>
          <option value="Absent">Absent</option>
        </select>

        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button type="submit">{editId ? "Update" : "Add"}</Button>

        {editId && (
          <Button variant="secondary" onClick={() => setEditId(null)}>
            Cancel
          </Button>
        )}
      </form>

      {/* FILTER BAR */}
      <h2 className="page-title">Filter Attendance</h2>

      <div className="filter-section">
        <select value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)}>
          <option value="">All Students</option>
          {students.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All</option>
          <option value="Present">Present</option>
          <option value="Absent">Absent</option>
        </select>
        <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
        <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
        <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button onClick={exportToExcel} className="ExportEx">
          Export Excel
        </Button>
      </div>

      {/* TABLE */}
      <div className="table-container">
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Student</th>
              <th>Course</th>
              <th>Present</th>
              <th>Absent</th>
              <th>%</th>
              <th>XP Score</th>
              <th>Rank</th>
            </tr>
          </thead>
          <tbody>
            {currentSummaries.length ? (
              currentSummaries.map((s, idx) => {
                const courseInfo = courses.find((c) => c._id === s.course?._id);
                const totalClasses = courseInfo?.totalClasses || 0;
                const totalHeld = s.present + s.absent;
                const attendance = totalHeld ? (s.present / totalHeld) * 100 : 0;
                const xpScore = totalClasses > 0 ? (s.present / totalClasses) * 10 : 0;

                const rank = getRank(s.present, totalClasses);

                const getColor = (value) => {
                  if (value >= 0.8) return "#4CAF50";
                  if (value >= 0.5) return "#FFC107";
                  if (value > 0.2) return "#FF9800";
                  return "#F44336";
                };

                return (
                  <tr key={idx}>
                    <td>{s.student?.name}</td>
                    <td>{s.course?.name}</td>
                    <td>{s.present}</td>
                    <td>{s.absent}</td>
                    <td style={{ color: getColor(attendance / 100), fontWeight: "600" }}>
                      {attendance.toFixed(1)}%
                    </td>
                    <td style={{ color: getColor(xpScore), fontWeight: "600" }}>
                      {xpScore.toFixed(2)}xp
                    </td>
                    <td>{rank ? rank.name : "N/A"}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="text-center">
                  No records
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          {Array.from({ length: totalPages }, (_, i) => (
            <Pagination.Item key={i} active={currentPage === i + 1} onClick={() => setCurrentPage(i + 1)}>
              {i + 1}
            </Pagination.Item>
          ))}
        </Pagination>
      )}

      {/* ✅ Custom Calendar Section */}
      <div className="calendar-section">
        <h3>Calendar View</h3>

        <div className="custom-calendar">
          {(() => {
            const today = new Date();
            const base = calendarDate ? new Date(calendarDate) : today;
            const currentMonth = base.getMonth();
            const currentYear = base.getFullYear();
            const firstDay = new Date(currentYear, currentMonth, 1).getDay();
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

            const blanks = Array.from({ length: firstDay }, (_, i) => (
              <div key={`b${i}`} className="empty-day" />
            ));

            const days = Array.from({ length: daysInMonth }, (_, i) => {
              const dateObj = new Date(currentYear, currentMonth, i + 1);
              const dateKey = toDateKey(dateObj);
              const isPresent = presentSet.has(dateKey);
              const isAbsent = absentSet.has(dateKey);
              const selectedKey = calendarDate ? toDateKey(calendarDate) : null;
              const isSelected = selectedKey === dateKey;

              return (
                <div
                  key={i}
                  className={[
                    "calendar-day",
                    isPresent ? "present-day" : "",
                    isAbsent ? "absent-day" : "",
                    isSelected ? "selected-day" : "",
                  ].join(" ")}
                  onClick={() => setCalendarDate(dateObj)}
                >
                  {i + 1}
                </div>
              );
            });

            return (
              <>
                <div className="calendar-header">
                  <button onClick={() => moveMonth(-1)}>◀</button>
                  <span>
                    {new Date(currentYear, currentMonth).toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <button onClick={() => moveMonth(1)}>▶</button>
                </div>

                <div className="calendar-grid">
                  <div className="weekday">Sun</div>
                  <div className="weekday">Mon</div>
                  <div className="weekday">Tue</div>
                  <div className="weekday">Wed</div>
                  <div className="weekday">Thu</div>
                  <div className="weekday">Fri</div>
                  <div className="weekday">Sat</div>

                  {blanks.concat(days)}
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default AdminManageAttendance;