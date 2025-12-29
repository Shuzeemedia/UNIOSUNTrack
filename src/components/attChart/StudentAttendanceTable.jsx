import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ATTENDANCE_THRESHOLD } from "../../utils/attendanceUtils";
import { getRank } from "../../utils/getRank";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
/** ============================== STYLES ============================== */
import "./StudentAttendanceTable.css";

function StudentAttendanceTable({
  attendanceSummary = [],
  studentView = false,
  onStudentClick,
  course,
  studentName,
}) {
  const [showAtRisk, setShowAtRisk] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const today = new Date().toLocaleDateString();

  const formatXP = (num) => `${num.toFixed(2)}xp`;
  const formatPercent = (num) => (Number.isInteger(num) ? num : num.toFixed(1));

  /** ============================== EXPORT HANDLERS ============================== */
  const exportCSV = () => {
    let rows;
    if (studentView) {
      rows = [
        ["Date", "Status", "Score (XP)"],
        ...attendanceSummary.map((r) => [
          new Date(r.date).toLocaleDateString(),
          r.status,
          r.status === "Present" ? "10xp" : "0xp",
        ]),

      ];
    } else {
      rows = [
        ["Student", "Student ID", "Present", "Absent", "Attendance %", "Score (XP)", "Rank"],
        ...attendanceSummary.map((rec) => {
          const present = rec.totalPresent ?? 0;
          const absent = rec.totalAbsent ?? 0;
          const total = present + absent;
          const totalPlanned = rec.totalPlanned ?? course?.totalClasses ?? 0;
          const attendancePct = total > 0 ? (present / total) * 100 : 0;
          const score = totalPlanned > 0 ? (present / totalPlanned) * 10 : 0;

          const rankInfo = getRank(present, totalPlanned);

          return [
            rec.student?.name || "Unknown",
            rec.student?.studentId || rec.student?.matricNumber || "N/A",
            present,
            absent,
            `${formatPercent(attendancePct)}%`,
            formatXP(score),
            rankInfo?.name || "-",
          ];
        }),
      ];
    }

    const csv =
      "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = studentView
      ? "student_attendance.csv"
      : "class_attendance.csv";
    link.click();
    toast.success("CSV downloaded successfully!");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const todayStr = new Date().toLocaleDateString();

    /* ================= HEADER ================= */
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

    /* ================= META INFO ================= */
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    let y = 34;

    // Left column
    doc.text(`Course: ${course?.name || "N/A"} ${course?.code ? `(${course.code})` : ""}`, 14, y);
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

    /* ================= SUMMARY BOX ================= */
    let present = 0,
      absent = 0,
      totalPlanned = course?.totalClasses || 0;

    if (studentView) {
      present = attendanceSummary.filter((r) => r.status === "Present").length;
      absent = attendanceSummary.filter((r) => r.status === "Absent").length;
    } else {
      present = attendanceSummary.reduce((s, r) => s + (r.totalPresent ?? 0), 0);
      absent = attendanceSummary.reduce((s, r) => s + (r.totalAbsent ?? 0), 0);
    }

    const attendancePct =
      present + absent > 0 ? (present / (present + absent)) * 100 : 0;

    const score =
      totalPlanned > 0 ? (present / totalPlanned) * 10 : 0;

    const rankInfo = getRank(present, totalPlanned);

    doc.setDrawColor(200);
    doc.rect(14, y, pageWidth - 28, 22);

    doc.setFont("helvetica", "bold");
    doc.text("ATTENDANCE SUMMARY", 16, y + 6);

    doc.setFont("helvetica", "normal");
    doc.text(
      `Present: ${present}   Absent: ${absent}   Attendance: ${attendancePct.toFixed(
        1
      )}%   Score: ${score.toFixed(2)}xp   Rank: ${rankInfo?.name || "-"}`,
      16,
      y + 14
    );

    y += 30;

    /* ================= TABLE ================= */
    autoTable(doc, {
      startY: y,
      head: [
        studentView
          ? ["Date", "Status"]
          : [
            "Student",
            "Matric No.",
            "Present",
            "Absent",
            "Attendance %",
            "Score (XP)",
            "Rank",
          ],
      ],
      body: attendanceSummary.map((r) =>
        studentView
          ? [
            new Date(r.date).toLocaleDateString(),
            r.status,
          ]
          : [
            r.student?.name || "Unknown",
            r.student?.studentId || r.student?.matricNumber || "N/A",
            r.totalPresent ?? 0,
            r.totalAbsent ?? 0,
            `${(
              ((r.totalPresent ?? 0) /
                ((r.totalPresent ?? 0) + (r.totalAbsent ?? 0) || 1)) *
              100
            ).toFixed(1)}%`,
            `${(
              course?.totalClasses
                ? ((r.totalPresent ?? 0) / course.totalClasses) * 10
                : 0
            ).toFixed(2)}xp`,
            getRank(r.totalPresent, course?.totalClasses || 0)?.name || "-",
          ]
      ),
      styles: {
        fontSize: 9,
        cellPadding: 3,
        halign: "center",
      },
      headStyles: {
        fillColor: [60, 60, 60],
        textColor: 255,
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    /* ================= FOOTER ================= */
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

    doc.save("attendance_report.pdf");
    toast.success("PDF downloaded successfully!");
  };


  const sendEmailReport = () =>
    toast.info("Email report feature coming soon!");

  /** ============================== EMPTY STATE ============================== */
  if (!attendanceSummary || attendanceSummary.length === 0)
    return <p className="no-records">No attendance records yet.</p>;

  /** ============================== TEACHER VIEW ============================== */
  if (!studentView) {
    const rankedData = useMemo(() => {
      return attendanceSummary.map((rec) => {
        const present = rec.totalPresent ?? 0;
        const absent = rec.totalAbsent ?? 0;
        const total = present + absent;
        const totalPlanned = rec.totalPlanned ?? course?.totalClasses ?? 0;
        const attendancePct = total > 0 ? (present / total) * 100 : 0;
        const score = totalPlanned > 0 ? (present / totalPlanned) * 10 : 0;

        return { ...rec, attendancePct, score };
      });
    }, [attendanceSummary, course]);

    const filteredData = useMemo(
      () =>
        rankedData.filter(
          (r) => !showAtRisk || r.attendancePct < ATTENDANCE_THRESHOLD
        ),
      [rankedData, showAtRisk]
    );

    const totalPages = Math.ceil(filteredData.length / pageSize);
    const pageData = filteredData.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );

    const totalPresent = filteredData.reduce(
      (sum, r) => sum + (r.totalPresent ?? 0),
      0
    );
    const totalAbsent = filteredData.reduce(
      (sum, r) => sum + (r.totalAbsent ?? 0),
      0
    );
    const overallPct =
      totalPresent + totalAbsent > 0
        ? (totalPresent / (totalPresent + totalAbsent)) * 100
        : 0;

    return (
      <div className="attendance-table-container">
        <div className="table-header">
          <h3>Class Attendance Report</h3>
          <div className="actions">
            <button onClick={exportCSV}>Download CSV</button>
            <button onClick={exportPDF}>Download PDF</button>
            {/* <button onClick={sendEmailReport} className="green-btn">
              Email Report
            </button> */}
          </div>
        </div>

        <button
          className={`filter-btn ${showAtRisk ? "danger" : "success"}`}
          onClick={() => {
            setShowAtRisk((prev) => !prev);
            setCurrentPage(1);
          }}
        >
          {showAtRisk ? "Show All Students" : "Show At-Risk Students"}
        </button>

        <div className="table-wrapper">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Matric No.</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Attendance %</th>
                <th>Score (XP)</th>
                <th>Rank</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((rec) => {
                const isLow = rec.attendancePct < ATTENDANCE_THRESHOLD;
                const rankInfo = getRank(
                  rec.totalPresent ?? 0,
                  rec.totalPlanned ?? course?.totalClasses ?? 0
                );
                return (
                  <tr
                    key={rec.student?._id || Math.random()}
                    className={isLow ? "low-row" : ""}
                  >
                    <td
                      className="student-name"
                      onClick={() => onStudentClick?.(rec.student?._id)}
                    >
                      {rec.student?.name || "Unknown"}
                    </td>
                    <td>
                      {rec.student?.studentId ||
                        rec.student?.matricNumber ||
                        "N/A"}
                    </td>
                    <td>{rec.totalPresent ?? 0}</td>
                    <td>{rec.totalAbsent ?? 0}</td>
                    <td>{formatPercent(rec.attendancePct)}%</td>
                    <td>{formatXP(rec.score)}</td>
                    <td className="rank-cell">
                      <img src={rankInfo.img} alt={rankInfo.name} />
                      <span>{rankInfo.name}</span>
                    </td>
                  </tr>
                );
              })}
              <tr className="summary-row">
                <td colSpan={2}>Class Totals</td>
                <td>{totalPresent}</td>
                <td>{totalAbsent}</td>
                <td>{formatPercent(overallPct)}%</td>
                <td colSpan={2}>—</td>
              </tr>
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              ◀ Prev
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(p + 1, totalPages))
              }
            >
              Next ▶
            </button>
          </div>
        )}
      </div>
    );
  }

  /** ============================== STUDENT VIEW ============================== */
  const presentCount = attendanceSummary.filter(
    (r) => r.status === "Present"
  ).length;
  const absentCount = attendanceSummary.filter(
    (r) => r.status === "Absent"
  ).length;
  const total = presentCount + absentCount;
  const totalPlanned = course?.totalClasses || 0;
  const attendancePct = total > 0 ? (presentCount / total) * 100 : 0;
  const score = totalPlanned > 0 ? (presentCount / totalPlanned) * 10 : 0;

  const rankInfo = getRank(presentCount, totalPlanned);

  return (
    <div className="attendance-table-container">
      <div className="table-header">
        <h3>Your Attendance Report</h3>
        <div className="actions">
          <button onClick={exportCSV}>Download CSV</button>
          <button onClick={exportPDF}>Download PDF</button>
          {/* <button onClick={sendEmailReport} className="green-btn">
            Email Report
          </button> */}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendanceSummary.map((r) => (
              <tr
                key={r._id}
                className={
                  r.status === "Absent"
                    ? "absent"
                    : r.status === "Present"
                      ? "present"
                      : ""
                }
              >
                <td>{new Date(r.date).toLocaleDateString()}</td>
                <td>{r.status}</td>
              </tr>
            ))}
            <tr className="summary-row">
              <td>Summary</td>
              <td>
                Present: {presentCount} | Absent: {absentCount} |{" "}
                {formatPercent(attendancePct)}% <br />
                Score: {formatXP(score)} ({presentCount}/{totalPlanned}) <br />
                Rank: {rankInfo?.name || "-"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StudentAttendanceTable;