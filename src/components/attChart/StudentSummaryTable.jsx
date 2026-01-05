import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ATTENDANCE_THRESHOLD } from "../../utils/attendanceUtils";
import { getRank } from "../../utils/getRank";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// import "./StudentSummaryTable.css";

function StudentSummaryTable({ data = [], course, onStudentClick }) {
    const [showAtRisk, setShowAtRisk] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const pageSize = 10;

    const formatPercent = (num) =>
        Number.isInteger(num) ? num : num.toFixed(1);

    const formatXP = (num) => `${num.toFixed(2)} XP`;

    /** ====================== COMPUTED DATA ====================== */
    const computedData = useMemo(() => {
        return data.map((row) => {
          const present = row.present ?? 0;
          const absent = row.absent ?? 0;
          const attendancePct = row.attendancePct ?? 0;
          const score = row.score ?? 0;
      
          const totalPlanned = row.totalPlanned ?? course?.totalClasses ?? 0;
          const rankInfo = getRank(present, totalPlanned);
      
          return {
            ...row,
            present,
            absent,
            attendancePct,
            score,
            rankInfo,
          };
        });
      }, [data, course]);
      

    /** ====================== FILTER ====================== */
    const filteredData = useMemo(() => {
        setCurrentPage(1); // reset page when filter toggles
        return computedData.filter(
            (r) => !showAtRisk || r.attendancePct < ATTENDANCE_THRESHOLD
        );
    }, [computedData, showAtRisk]);

    /** ====================== PAGINATION ====================== */
    const totalPages = Math.ceil(filteredData.length / pageSize);

    const pageData = filteredData.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    /** ====================== CLASS TOTALS ====================== */
    const totalPresent = filteredData.reduce((s, r) => s + r.present, 0);
    const totalAbsent = filteredData.reduce((s, r) => s + r.absent, 0);
    const overallPct =
        totalPresent + totalAbsent > 0
            ? (totalPresent / (totalPresent + totalAbsent)) * 100
            : 0;

    /** ====================== EXPORT CSV ====================== */
    const exportCSV = () => {
        const rows = [
            [
                "Student",
                "Matric No",
                "Present",
                "Absent",
                "Attendance %",
                "Score (XP)",
                "Rank",
            ],
            ...filteredData.map((r) => [
                r.student?.name || "Unknown",
                r.student?.studentId || "N/A",
                r.present,
                r.absent,
                `${formatPercent(r.attendancePct)}%`,
                formatXP(r.score),
                r.rankInfo?.name || "-",
            ]),
        ];

        const csv =
            "data:text/csv;charset=utf-8," +
            rows.map((e) => e.join(",")).join("\n");

        const link = document.createElement("a");
        link.href = encodeURI(csv);
        link.download = "attendance_summary.csv";
        link.click();

        toast.success("CSV downloaded successfully!");
    };

    /** ====================== EXPORT PDF ====================== */
    const exportPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("Class Attendance Summary", pageWidth / 2, 15, {
            align: "center",
        });

        doc.setFontSize(10);
        doc.text(
            `Course: ${course?.name || "N/A"} (${course?.code || ""})`,
            14,
            25
        );

        autoTable(doc, {
            startY: 32,
            head: [
                [
                    "Student",
                    "Matric No",
                    "Present",
                    "Absent",
                    "Attendance %",
                    "Score (XP)",
                    "Rank",
                ],
            ],
            body: filteredData.map((r) => [
                r.student?.name || "Unknown",
                r.student?.studentId || "N/A",
                r.present,
                r.absent,
                `${formatPercent(r.attendancePct)}%`,
                formatXP(r.score),
                r.rankInfo?.name || "-",
            ]),
            styles: {
                fontSize: 9,
                halign: "center",
            },
            headStyles: {
                fillColor: [60, 60, 60],
                textColor: 255,
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245],
            },
        });

        doc.save("attendance_summary.pdf");
        toast.success("PDF downloaded successfully!");
    };

    /** ====================== EMPTY STATE ====================== */
    if (!data.length) {
        return <p className="no-records">No attendance summary available.</p>;
    }

    return (
        <div className="attendance-table-container">
            <div className="table-header">
                <h3>Attendance Summary</h3>

                <div className="actions">
                    <button onClick={exportCSV}>Download CSV</button>
                    <button onClick={exportPDF}>Download PDF</button>
                </div>
            </div>

            <button
                className={`filter-btn ${showAtRisk ? "danger" : "success"}`}
                onClick={() => setShowAtRisk((p) => !p)}
            >
                {showAtRisk ? "Show All Students" : "Show At-Risk Students"}
            </button>

            <div className="table-wrapper">
                <table className="attendance-table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Matric No</th>
                            <th>Present</th>
                            <th>Absent</th>
                            <th>Attendance %</th>
                            <th>Score (XP)</th>
                            <th>Rank</th>
                        </tr>
                    </thead>

                    <tbody>
                        {pageData.map((r) => (
                            <tr
                                key={r.student?._id}
                                className={
                                    r.attendancePct < ATTENDANCE_THRESHOLD ? "low-row" : ""
                                }
                            >
                                <td
                                    className="student-name"
                                    onClick={() =>
                                        onStudentClick?.(r.student?._id)
                                    }
                                >
                                    {r.student?.name || "Unknown"}
                                </td>

                                <td>{r.student?.studentId || "N/A"}</td>
                                <td>{r.present}</td>
                                <td>{r.absent}</td>
                                <td>{formatPercent(r.attendancePct)}%</td>
                                <td>{formatXP(r.score)}</td>
                                <td className="rank-cell">
                                    <img src={r.rankInfo.img} alt={r.rankInfo.name} />
                                    <span>{r.rankInfo.name}</span>
                                </td>
                            </tr>
                        ))}

                        {/* ===== CLASS TOTALS ===== */}
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

            {/* ================= PAGINATION ================= */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        disabled={currentPage === 1}
                        onClick={() =>
                            setCurrentPage((p) => Math.max(p - 1, 1))
                        }
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

export default StudentSummaryTable;
