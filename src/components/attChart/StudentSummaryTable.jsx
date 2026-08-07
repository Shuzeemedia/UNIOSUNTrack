import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ATTENDANCE_THRESHOLD } from "../../utils/attendanceUtils";
import { getRank } from "../../utils/getRank";
import { toast } from "react-toastify";
import "./StudentSummaryTable.css";
import {
    FaFileCsv,
    FaFilePdf,
    FaFilter,
    FaUserGraduate,
    FaChevronLeft,
    FaChevronRight,
    FaExclamationTriangle
} from "react-icons/fa";

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

            const totalSessions = present + absent;

            const attendancePct =
                totalSessions > 0 ? (present / totalSessions) * 100 : 0;

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

        const courseName = course?.name || "N/A";
        const courseCode = course?.code || "";
        const department = course?.department?.name || "N/A";
        const level = course?.level || "N/A";
        const semester = course?.semester || "N/A";
        const lecturer = course?.teacher?.name || "N/A";

        /** =====================================================
         * HEADER
         * ===================================================== */

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(11, 102, 35);

        doc.text(
            "UNIOSUNTrack",
            pageWidth / 2,
            15,
            { align: "center" }
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(90, 90, 90);

        doc.text(
            "Web-Based Student Attendance Management System",
            pageWidth / 2,
            21,
            { align: "center" }
        );

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(30, 30, 30);

        doc.text(
            "Class Attendance Summary",
            pageWidth / 2,
            29,
            { align: "center" }
        );

        // Header separator
        doc.setDrawColor(11, 102, 35);
        doc.setLineWidth(0.8);

        doc.line(
            14,
            34,
            pageWidth - 14,
            34
        );

        /** =====================================================
         * COURSE INFORMATION
         * ===================================================== */

        let y = 43;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);

        doc.text(
            "Course Information",
            14,
            y
        );

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
         * ATTENDANCE RECORDS
         * ===================================================== */

        const tableTitleY = y + 30;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);

        doc.text(
            "Student Attendance Records",
            14,
            tableTitleY
        );

        // Section separator
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.4);

        doc.line(
            14,
            tableTitleY + 4,
            pageWidth - 14,
            tableTitleY + 4
        );

        /** =====================================================
         * TABLE
         * ===================================================== */

        const tableStartY = tableTitleY + 12;

        const tableBody = filteredData.map((r) => [
            r.student?.name || "Unknown",
            r.student?.studentId || "N/A",
            r.present ?? 0,
            r.absent ?? 0,
            `${formatPercent(r.attendancePct)}%`,
            formatXP(r.score),
            r.rankInfo?.name || "-",
        ]);

        autoTable(doc, {
            startY: tableStartY,

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

            columnStyles: {
                0: {
                    cellWidth: 42,
                },
                1: {
                    cellWidth: 30,
                },
                2: {
                    cellWidth: 18,
                },
                3: {
                    cellWidth: 18,
                },
                4: {
                    cellWidth: 27,
                },
                5: {
                    cellWidth: 25,
                },
                6: {
                    cellWidth: 35,
                },
            },

            didParseCell: (data) => {
                if (data.section !== "body") return;

                // Attendance percentage
                if (data.column.index === 4) {
                    const value = parseFloat(
                        String(data.cell.raw).replace("%", "")
                    );

                    if (value >= 75) {
                        data.cell.styles.textColor = [22, 101, 52];
                    } else if (value >= 50) {
                        data.cell.styles.textColor = [180, 83, 9];
                    } else {
                        data.cell.styles.textColor = [185, 28, 28];
                    }

                    data.cell.styles.fontStyle = "bold";
                }

                // Rank
                if (data.column.index === 6) {
                    data.cell.styles.fontStyle = "bold";
                    data.cell.styles.textColor = [11, 102, 35];
                }

                // Present
                if (data.column.index === 2) {
                    data.cell.styles.textColor = [22, 101, 52];
                    data.cell.styles.fontStyle = "bold";
                }

                // Absent
                if (data.column.index === 3) {
                    data.cell.styles.textColor = [185, 28, 28];
                    data.cell.styles.fontStyle = "bold";
                }

                // XP
                if (data.column.index === 5) {
                    data.cell.styles.fontStyle = "bold";
                }
            },

            margin: {
                left: 14,
                right: 14,
                bottom: 25,
            },

            showHead: "everyPage",
        });

        /** =====================================================
         * REPORT SUMMARY
         * ===================================================== */

        const finalY =
            doc.lastAutoTable?.finalY || tableStartY;

        let summaryY = finalY + 14;

        // If there isn't enough room, create a new page
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
            `Total Students: ${filteredData.length}`,
            14,
            summaryY
        );

        const totalPresent = filteredData.reduce(
            (total, student) =>
                total + Number(student.present || 0),
            0
        );

        const totalAbsent = filteredData.reduce(
            (total, student) =>
                total + Number(student.absent || 0),
            0
        );

        doc.text(
            `Total Present Records: ${totalPresent}`,
            14,
            summaryY + 6
        );

        doc.text(
            `Total Absent Records: ${totalAbsent}`,
            14,
            summaryY + 12
        );

        /** =====================================================
         * FOOTER
         * ===================================================== */

        const pageCount = doc.getNumberOfPages();

        for (let page = 1; page <= pageCount; page++) {
            doc.setPage(page);

            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.4);

            doc.line(
                14,
                pageHeight - 17,
                pageWidth - 14,
                pageHeight - 17
            );

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

        const filename =
            `UNIOSUNTrack_${safeCourseCode}_Class_Attendance_Summary.pdf`;

        doc.save(filename);

        toast.success(
            "Attendance summary downloaded successfully"
        );
    };

    /** ====================== EMPTY STATE ====================== */
    if (!data.length) {
        return <p className="no-records">No attendance summary available.</p>;
    }

    return (
        <div className="attendance-table-container">
            <div className="table-header">


                <div className="table-title">

                    <div>

                        <h3>Class Performance Summary</h3>

                        <p>
                            {filteredData.length} student
                            {filteredData.length !== 1 && "s"} analysed
                        </p>

                    </div>

                </div>

                <div className="actions">

                    <div className="actions">
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

            </div>

            <button
                className={`risk-filter ${showAtRisk ? "active" : ""}`}
                onClick={() => setShowAtRisk((p) => !p)}
            >
                <FaExclamationTriangle />

                {showAtRisk
                    ? "Viewing At-Risk Students"
                    : "Show At-Risk Students"}
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
                            <tr key={r.student?._id}>
                                <td
                                    className="student-name clickable"
                                    onClick={() => onStudentClick?.(r.student?._id)}
                                >

                                    <div className="student-cell">
                                        {/* 
                                        <div className="student-avatar">

                                            {r.student?.name?.charAt(0)}

                                        </div> */}

                                        <div>

                                            <strong>{r.student?.name}</strong>

                                        </div>

                                    </div>

                                </td>

                                <td>{r.student?.studentId || "N/A"}</td>
                                <td>{r.present}</td>
                                <td>{r.absent}</td>
                                <td>

                                    <span
                                        className={`attendance-pill ${r.attendancePct >= 75
                                            ? "good"
                                            : r.attendancePct >= ATTENDANCE_THRESHOLD
                                                ? "warning"
                                                : "danger"
                                            }`}
                                    >

                                        {formatPercent(r.attendancePct)}%

                                    </span>

                                </td>

                                <td>
                                    <span className="xp-badge">

                                        {formatXP(r.score)}

                                    </span>
                                </td>

                                <td className="rank-cell">

                                    <div className="rank-badges">

                                        <img
                                            src={r.rankInfo.img}
                                            alt={r.rankInfo.name}
                                        />

                                        <span>

                                            {r.rankInfo.name}

                                        </span>

                                    </div>

                                </td>
                            </tr>
                        ))}

                        {/* ===== CLASS TOTALS ===== */}
                        <tr className="summary-row">

                            <td colSpan={2}>

                                <strong>

                                    Overall Class Performance

                                </strong>

                            </td>
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