import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";
import "./StudentAttendanceTable.css";
import {
  FaFileCsv,
  FaFilePdf,
  FaDownload,
  FaFilter,
  FaChevronLeft,
  FaChevronRight
} from "react-icons/fa";

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
    const pageHeight = doc.internal.pageSize.getHeight();

    const today = new Date();

    const todayStr = today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const generatedTime = today.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const reportTitle = studentView
      ? "Student Attendance Report"
      : "Class Attendance Report";

    const courseName = course?.name || "N/A";
    const courseCode = course?.code || "";
    const department = course?.department?.name || "N/A";
    const level = course?.level || "N/A";
    const semester = course?.semester || "N/A";
    const lecturer = course?.teacher?.name || "N/A";

    /** =====================================================
     * HEADER
     * ===================================================== */

    // System name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(11, 102, 35);

    doc.text(
      "UNIOSUNTrack",
      pageWidth / 2,
      15,
      { align: "center" }
    );

    // System description
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);

    doc.text(
      "Web-Based Student Attendance Management System",
      pageWidth / 2,
      21,
      { align: "center" }
    );

    // Report title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);

    doc.text(
      reportTitle,
      pageWidth / 2,
      29,
      { align: "center" }
    );

    // Header line
    doc.setDrawColor(11, 102, 35);
    doc.setLineWidth(0.8);

    doc.line(
      14,
      34,
      pageWidth - 14,
      34
    );

    /** =====================================================
     * REPORT INFORMATION
     * ===================================================== */

    let y = 43;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);

    doc.text("Course Information", 14, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    y += 7;

    // Left column
    doc.text(
      `Course: ${courseName}${courseCode ? ` (${courseCode})` : ""}`,
      14,
      y
    );

    doc.text(
      `Department: ${department}`,
      14,
      y + 6
    );

    doc.text(
      `Level: ${level}`,
      14,
      y + 12
    );

    // Right column
    const rightColumn = pageWidth / 2 + 10;

    doc.text(
      `Semester: ${semester}`,
      rightColumn,
      y
    );

    doc.text(
      `Lecturer: ${lecturer}`,
      rightColumn,
      y + 6
    );

    doc.text(
      `Generated: ${todayStr} at ${generatedTime}`,
      rightColumn,
      y + 12
    );

    /** =====================================================
     * STUDENT INFORMATION
     * ===================================================== */

    if (studentView) {
      y += 22;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);

      doc.text(
        "Student Information",
        14,
        y
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      y += 7;

      doc.text(
        `Student: ${studentName || "N/A"}`,
        14,
        y
      );
    }

    /** =====================================================
     * TABLE
     * ===================================================== */

    const tableStartY = y + 28;

    const tableHead = studentView
      ? [
        ["Date", "Session", "Status"],
      ]
      : [
        ["Student", "Matric No", "Date", "Session", "Status"],
      ];

    const tableBody = filteredRows.map((row) => {
      const formattedDate = row.date
        ? new Date(row.date).toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
        : "N/A";

      if (studentView) {
        return [
          formattedDate,
          row.sessionType || "N/A",
          row.status || "N/A",
        ];
      }

      return [
        row.student?.name || "Unknown",
        row.student?.studentId || "N/A",
        formattedDate,
        row.sessionType || "N/A",
        row.status || "N/A",
      ];
    });

    autoTable(doc, {
      startY: tableStartY,

      head: tableHead,

      body: tableBody,

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: 3.5,
        halign: "center",
        valign: "middle",
        textColor: [45, 45, 45],
        lineColor: [220, 220, 220],
        lineWidth: 0.2,
      },

      headStyles: {
        fillColor: [11, 102, 35],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "center",
        valign: "middle",
      },

      alternateRowStyles: {
        fillColor: [248, 250, 249],
      },

      bodyStyles: {
        minCellHeight: 9,
      },

      columnStyles: studentView
        ? {
          0: {
            cellWidth: 65,
          },
          1: {
            cellWidth: 55,
          },
          2: {
            cellWidth: 35,
          },
        }
        : {
          0: {
            cellWidth: 45,
          },
          1: {
            cellWidth: 32,
          },
          2: {
            cellWidth: 45,
          },
          3: {
            cellWidth: 30,
          },
          4: {
            cellWidth: 25,
          },
        },

      didParseCell: (data) => {
        // Status styling
        if (
          data.section === "body" &&
          data.column.index === tableHead[0].length - 1
        ) {
          const status = String(data.cell.raw || "").toLowerCase();

          if (status === "present") {
            data.cell.styles.textColor = [22, 101, 52];
            data.cell.styles.fontStyle = "bold";
          }

          if (status === "absent") {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = "bold";
          }

          if (status === "late") {
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },

      margin: {
        left: 14,
        right: 14,
      },
    });

    /** =====================================================
     * SUMMARY
     * ===================================================== */

    const finalY = doc.lastAutoTable?.finalY || tableStartY;

    let summaryY = finalY + 12;

    // Avoid placing summary too close to bottom
    if (summaryY > pageHeight - 35) {
      doc.addPage();
      summaryY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);

    doc.text(
      "Report Summary",
      14,
      summaryY
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);

    summaryY += 7;

    doc.text(
      `Total Records: ${filteredRows.length}`,
      14,
      summaryY
    );

    /** =====================================================
     * FOOTER
     * ===================================================== */

    const pageCount = doc.getNumberOfPages();

    for (let page = 1; page <= pageCount; page++) {
      doc.setPage(page);

      // Footer line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.4);

      doc.line(
        14,
        pageHeight - 17,
        pageWidth - 14,
        pageHeight - 17
      );

      // Footer text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);

      doc.text(
        "UNIOSUNTrack Attendance Management System",
        14,
        pageHeight - 10
      );

      doc.text(
        `Page ${page} of ${pageCount}`,
        pageWidth - 14,
        pageHeight - 10,
        {
          align: "right",
        }
      );
    }

    /** =====================================================
     * DOWNLOAD
     * ===================================================== */

    const safeCourseCode = courseCode
      ? courseCode.replace(/[^a-zA-Z0-9-_]/g, "_")
      : "Course";

    const filename = studentView
      ? `UNIOSUNTrack_${safeCourseCode}_Student_Attendance.pdf`
      : `UNIOSUNTrack_${safeCourseCode}_Class_Attendance.pdf`;

    doc.save(filename);

    toast.success("Attendance report downloaded successfully");
  };

  if (!rows.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <FaListOl />
        </div>

        <h3>
          {studentView
            ? "No Attendance Records Yet"
            : "No Class Attendance Yet"}
        </h3>

        <p>
          {studentView
            ? "Your attendance records will appear here once attendance has been taken."
            : "No attendance has been recorded for this course yet. Create your first attendance session to begin tracking students."}
        </p>
      </div>
    );
  }

  /** ================= TABLE ================= */
  return (
    <div className="attendance-table-container">
      <div className="table-header">
        <div className="table-title">
          <div>
            <h3>
              {studentView ? "Attendance Records" : "Class Attendance"}
            </h3>

            <p>
              {filteredRows.length} record{filteredRows.length !== 1 && "s"} found
            </p>
          </div>
        </div>

        <div className="actions">
          <div className="session-filter">

            <FaFilter />

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
          </div>

          <button className="export-btn csv" onClick={exportCSV}>
            <FaFileCsv />
            CSV
          </button>

          <button className="export-btn pdf" onClick={exportPDF}>
            <FaFilePdf />
            PDF
          </button>
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

                <td>

                  <div className="date-cell">

                    <span>

                      {new Date(r.date).toLocaleDateString()}

                    </span>

                    <small>

                      {new Date(r.date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}

                    </small>

                  </div>

                </td>

                <td>

                  <div className="session-chip">

                    {SESSION_ICON[r.sessionType]}

                    <span>{r.sessionType}</span>

                  </div>

                </td>

                <td>

                  <span
                    className={`status-badge ${r.status.toLowerCase()}`}
                  >

                    {r.status}

                  </span>

                </td>
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