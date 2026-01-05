import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";
import "./StudentAttendanceTable.css";

import { MdQrCodeScanner } from "react-icons/md";
import { FaPen, FaListOl } from "react-icons/fa";

const SESSION_ICON = {
  QR: <MdQrCodeScanner />,
  MANUAL: <FaPen />,
  ROLLCALL: <FaListOl />,
};

const ROWS_PER_PAGE = 10;

function StudentAttendanceTable({
  attendanceSummary = [],
  studentView = false,
  onStudentClick,
  course,
  studentName,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSession, setSelectedSession] = useState("all");

  /** ================= NORMALIZE ROWS ================= */
  const rows = useMemo(() => {
    return attendanceSummary.map((r, idx) => {
      const sessionDate = r.session?.createdAt || r.date;
      const sessionType = r.sessionType || r.session?.type || "MANUAL";

      const sessionKey =
        r.session?._id ||
        `${new Date(sessionDate).toISOString()}-${sessionType}`;

      return {
        key: r._id || `${r.student?._id}-${sessionKey}-${idx}`,
        student: r.student,
        status: r.status,
        date: sessionDate,
        sessionType,
        sessionMode: r.session?.mode || "single",
        sessionId: sessionKey,
      };
    });
  }, [attendanceSummary]);

  /** ================= UNIQUE SESSIONS ================= */
  /** ================= UNIQUE SESSIONS ================= */
  const sessions = useMemo(() => {
    const map = new Map();

    rows.forEach((r) => {
      if (!map.has(r.sessionId)) {
        const sessionDate = new Date(r.date);
        const timeStr = sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = sessionDate.toLocaleDateString();

        // Short unique ID (first 5 chars of sessionId)
        const shortId = r.sessionId.slice(0, 5);

        map.set(r.sessionId, {
          id: r.sessionId,
          label: `${dateStr} ${timeStr} - ${r.sessionType} [${shortId}]`,
        });
      }
    });

    return Array.from(map.values());
  }, [rows]);


  /** ================= FILTER BY SESSION ================= */
  const filteredRows = useMemo(() => {
    if (selectedSession === "all") return rows;
    return rows.filter((r) => r.sessionId === selectedSession);
  }, [rows, selectedSession]);

  /** ================= PAGINATION ================= */
  const totalPages = Math.ceil(filteredRows.length / ROWS_PER_PAGE);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredRows.slice(start, start + ROWS_PER_PAGE);
  }, [filteredRows, currentPage]);

  /** ================= EXPORT CSV ================= */
  const exportCSV = () => {
    const rowsData = [
      studentView
        ? ["Date", "Session Type", "Status"]
        : ["Student", "Matric No", "Date", "Session Type", "Status"],
      ...filteredRows.map((r) =>
        studentView
          ? [new Date(r.date).toLocaleString(), r.sessionType, r.status]
          : [
            r.student?.name || "Unknown",
            r.student?.studentId || "N/A",
            new Date(r.date).toLocaleString(),
            r.sessionType,
            r.status,
          ]
      ),
    ];

    const csv =
      "data:text/csv;charset=utf-8," +
      rowsData.map((e) => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = "attendance_session.csv";
    link.click();

    toast.success("CSV downloaded");
  };

  /** ================= EXPORT PDF ================= */
  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const todayStr = new Date().toLocaleDateString();

    /** ================= HEADER ================= */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("UNIOSUNTRACK ATTENDANCE SYSTEM", pageWidth / 2, 15, {
      align: "center",
    });

    doc.setFontSize(13);
    doc.text(
      studentView ? "Student Attendance Report" : "Class Attendance Report",
      pageWidth / 2,
      23,
      { align: "center" }
    );

    doc.setDrawColor(180);
    doc.line(14, 27, pageWidth - 14, 27);

    /** ================= META INFO ================= */
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    let y = 34;
    // Left column
    doc.text(`Course: ${course?.name || "N/A"} ${course?.code || ""}`, 14, y);
    doc.text(`Department: ${course?.department?.name || "N/A"}`, 14, y + 6);
    doc.text(`Level: ${course?.level || "N/A"}`, 14, y + 12);

    // Right column
    doc.text(`Semester: ${course?.semester || "N/A"}`, pageWidth / 2 + 10, y);
    doc.text(`Lecturer: ${course?.teacher?.name || "N/A"}`, pageWidth / 2 + 10, y + 6);
    doc.text(`Generated: ${todayStr}`, pageWidth / 2 + 10, y + 12);

    if (studentView) {
      doc.text(`Student: ${studentName || "N/A"}`, 14, y + 18);
      y += 10;
    }

    y += 26;

    /** ================= TABLE ================= */
    autoTable(doc, {
      startY: y,
      head: [
        studentView
          ? ["Date", "Session", "Status"]
          : ["Student", "Matric No", "Date", "Session", "Status"],
      ],
      body: filteredRows.map((r) =>
        studentView
          ? [new Date(r.date).toLocaleString(), r.sessionType, r.status]
          : [
            r.student?.name || "Unknown",
            r.student?.studentId || "N/A",
            new Date(r.date).toLocaleString(),
            r.sessionType,
            r.status,
          ]
      ),
      styles: { fontSize: 9, cellPadding: 3, halign: "center" },
      headStyles: { fillColor: [60, 60, 60], textColor: 255, halign: "center" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    /** ================= FOOTER ================= */
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.text(
        `Page ${i} of ${pageCount} — Generated by UNIOSUNTRACK`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    doc.save("attendance_session.pdf");
    toast.success("PDF downloaded");
  };

  if (!rows.length) return <p className="no-records">No attendance records yet.</p>;

  /** ================= TABLE ================= */
  return (
    <div className="attendance-table-container">
      <div className="table-header">
        <h3>{studentView ? "My Attendance" : "Class Attendance (Sessions)"}</h3>

        <div className="actions">
          <select
            className="session-dropdown"
            value={selectedSession}
            onChange={(e) => {
              setSelectedSession(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Sessions</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <button onClick={exportCSV}>Download CSV</button>
          <button onClick={exportPDF}>Download PDF</button>
        </div>

      </div>

      <div className="table-wrapper">
        <table className="attendance-table">
          <thead>
            <tr>
              {!studentView && <th>Student</th>}
              {!studentView && <th>Matric No</th>}
              <th>Date & Time</th>
              <th>Session</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {paginatedRows.map((r) => (
              <tr
                key={r.key}
                className={
                  r.status === "Absent"
                    ? "absent"
                    : r.status === "Present"
                      ? "present"
                      : ""
                }
              >
                {!studentView && (
                  <td
                    className="student-name"
                    onClick={() => onStudentClick?.(r.student?._id)}
                  >
                    {r.student?.name || "Unknown"}
                  </td>
                )}

                {!studentView && <td>{r.student?.studentId || "N/A"}</td>}

                <td>{new Date(r.date).toLocaleString()}</td>

                <td className="session-cell">
                  {SESSION_ICON[r.sessionType]} {r.sessionType}
                </td>

                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Prev
          </button>

          <span>
            Page {currentPage} of {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default StudentAttendanceTable;