import { useEffect, useState, useContext } from "react";
import { Container, Alert, Spinner } from "react-bootstrap";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
    FiArrowLeft,
    FiAward,
    FiCalendar,
    FiCheckCircle,
    FiClock,
    FiDownload,
    FiFileText,
    FiMapPin,
    FiShield,
    FiUser,
    FiXCircle,
} from "react-icons/fi";

import api from "../../api/api";
import { getRankByPercentage } from "../../utils/getRankByPercentage";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";

import "./trans.css";

const Transcript = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [student, setStudent] = useState(null);
    const [summary, setSummary] = useState(null);

    const [downloading, setDownloading] = useState(false);
    const [downloadingClearance, setDownloadingClearance] = useState(false);

    // =====================================================
    // Attendance helpers
    // =====================================================

    const getPercentageColor = (percentage) => {
        if (percentage < 45) return "text-danger";
        if (percentage < 70) return "text-warning";
        return "text-success";
    };

    const getAttendanceComment = (percentage) => {
        if (percentage >= 90) {
            return "Outstanding attendance record. The student demonstrated exceptional consistency and commitment throughout the academic program.";
        }

        if (percentage >= 75) {
            return "Very good attendance performance. The student maintained a strong and reliable presence during academic sessions.";
        }

        if (percentage >= 60) {
            return "Satisfactory attendance performance. The student met the minimum attendance expectations.";
        }

        if (percentage >= 45) {
            return "Fair attendance record. Improvement in consistency would have enhanced academic engagement.";
        }

        return "Poor attendance record. The student's attendance fell below acceptable academic standards.";
    };

    // =====================================================
    // Fetch transcript
    // =====================================================

    useEffect(() => {
        if (!user) return;

        if (!user.graduated) {
            navigate("/student/dashboard", {
                state: {
                    msg: "Transcript available only after graduation.",
                },
            });

            return;
        }

        const fetchTranscript = async () => {
            try {
                setLoading(true);
                setError("");

                const res = await api.get("/alumni/transcript");

                setStudent(res.data?.student || null);
                setSummary(res.data?.academicSummary || null);
            } catch (err) {
                console.error("Transcript loading error:", err);

                const message =
                    err.response?.data?.msg ||
                    "Failed to load your academic transcript.";

                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchTranscript();
    }, [user, navigate]);

    // =====================================================
    // Download helper
    // =====================================================

    const downloadBlob = (blobData, filename) => {
        const blob = new Blob([blobData], {
            type: "application/pdf",
        });

        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);

        window.URL.revokeObjectURL(url);
    };

    // =====================================================
    // Download transcript
    // =====================================================

    const handleDownloadPdf = async () => {
        if (!student?.graduationVerified) {
            toast.warning(
                "Your graduation record must be verified before downloading the transcript."
            );
            return;
        }

        try {
            setDownloading(true);

            const res = await api.get("/alumni/transcript/pdf", {
                responseType: "blob",
            });

            downloadBlob(
                res.data,
                `Transcript_${student?.name || "Student"}.pdf`
            );

            toast.success("Transcript downloaded successfully.");
        } catch (err) {
            console.error("Transcript download error:", err);

            toast.error(
                err.response?.data?.msg ||
                "Failed to download transcript."
            );
        } finally {
            setDownloading(false);
        }
    };

    // =====================================================
    // Download clearance letter
    // =====================================================

    const handleDownloadClearance = async () => {
        if (!student?.graduationVerified) {
            toast.warning(
                "Your graduation record must be verified before downloading the clearance letter."
            );
            return;
        }

        try {
            setDownloadingClearance(true);

            const res = await api.get(
                "/alumni/clearance-letter/pdf",
                {
                    responseType: "blob",
                }
            );

            downloadBlob(
                res.data,
                `Clearance_${student?.name || "Student"}.pdf`
            );

            toast.success("Clearance letter downloaded successfully.");
        } catch (err) {
            console.error("Clearance download error:", err);

            toast.error(
                err.response?.data?.msg ||
                "Failed to download clearance letter."
            );
        } finally {
            setDownloadingClearance(false);
        }
    };

    // =====================================================
    // Loading
    // =====================================================

    if (loading) {
        return <LoadingSpinner />;
    }

    // =====================================================
    // Error
    // =====================================================

    if (error) {
        return (
            <Container className="transcript-page">
                <div className="transcript-error">
                    <div className="transcript-error-icon">
                        <FiXCircle />
                    </div>

                    <h3>Unable to Load Transcript</h3>

                    <p>{error}</p>

                    <button
                        type="button"
                        className="transcript-secondary-btn"
                        onClick={() => navigate("/student/dashboard")}
                    >
                        <FiArrowLeft />
                        Back to Dashboard
                    </button>
                </div>
            </Container>
        );
    }

    if (!student) {
        return (
            <Container className="transcript-page">
                <Alert variant="warning">
                    Student transcript information is unavailable.
                </Alert>
            </Container>
        );
    }

    // =====================================================
    // Attendance data
    // =====================================================

    const attendancePercentage = Number(
        summary?.attendancePercentage || 0
    );

    const rank = getRankByPercentage(attendancePercentage);

    const percentageClass =
        getPercentageColor(attendancePercentage);

    const attendanceComment =
        getAttendanceComment(attendancePercentage);

    const isVerified = Boolean(student.graduationVerified);

    return (
        <Container className="transcript-page">

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <div className="transcript-header">

                <div>
                    <button
                        type="button"
                        className="back-dashboard-btn"
                        onClick={() => navigate("/student/dashboard")}
                    >
                        <FiArrowLeft />
                        Dashboard
                    </button>

                    <div className="transcript-heading">
                        <div className="transcript-heading-icon">
                            <FiFileText />
                        </div>

                        <div>
                            <h1>Academic Transcript</h1>

                            <p>
                                Official academic and attendance record
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    className={`verification-badge ${
                        isVerified
                            ? "verification-success"
                            : "verification-pending"
                    }`}
                >
                    {isVerified ? (
                        <FiCheckCircle />
                    ) : (
                        <FiClock />
                    )}

                    <span>
                        {isVerified
                            ? "Verified Record"
                            : "Verification Pending"}
                    </span>
                </div>
            </div>

            {/* =================================================
                STUDENT INFORMATION
            ================================================= */}

            <section className="transcript-card student-record-card">

                <div className="section-header">
                    <div className="section-title-wrapper">
                        <div className="section-icon">
                            <FiUser />
                        </div>

                        <div>
                            <h2>Student Information</h2>
                            <p>Official student identification details</p>
                        </div>
                    </div>
                </div>

                <div className="student-info-grid">

                    <div className="student-info-item">
                        <span>Full Name</span>
                        <strong>{student.name || "N/A"}</strong>
                    </div>

                    <div className="student-info-item">
                        <span>Student ID</span>
                        <strong>{student.studentId || "N/A"}</strong>
                    </div>

                    <div className="student-info-item">
                        <span>Department</span>
                        <strong>{student.department || "N/A"}</strong>
                    </div>

                    <div className="student-info-item">
                        <span>Graduation Date</span>

                        <strong>
                            {student.graduationDate
                                ? new Date(
                                    student.graduationDate
                                ).toLocaleDateString(
                                    "en-NG",
                                    {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    }
                                )
                                : "N/A"}
                        </strong>
                    </div>

                </div>

                <div className="record-verification">

                    <div className="record-verification-icon">
                        <FiShield />
                    </div>

                    <div className="record-verification-content">
                        <span>University Verification</span>

                        <strong>
                            {isVerified
                                ? "Graduation record verified by the university"
                                : "Graduation record is awaiting administrative verification"}
                        </strong>
                    </div>

                    <div
                        className={`record-status ${
                            isVerified
                                ? "record-status-success"
                                : "record-status-pending"
                        }`}
                    >
                        {isVerified ? (
                            <>
                                <FiCheckCircle />
                                Verified
                            </>
                        ) : (
                            <>
                                <FiClock />
                                Pending
                            </>
                        )}
                    </div>

                </div>

                {!isVerified && (
                    <div className="verification-warning">
                        <FiClock />

                        <p>
                            Your graduation record is currently pending
                            administrative verification. Official downloads
                            will become available after verification is
                            completed.
                        </p>
                    </div>
                )}

            </section>

            {/* =================================================
                DOCUMENT DOWNLOADS
            ================================================= */}

            <section className="transcript-card documents-card">

                <div className="section-header">

                    <div className="section-title-wrapper">

                        <div className="section-icon">
                            <FiDownload />
                        </div>

                        <div>
                            <h2>Official Documents</h2>

                            <p>
                                Download your official academic documents
                            </p>
                        </div>

                    </div>

                </div>

                <div className="document-actions">

                    <button
                        type="button"
                        className="document-download-btn"
                        onClick={handleDownloadPdf}
                        disabled={
                            downloading ||
                            downloadingClearance ||
                            !isVerified
                        }
                    >
                        <span className="document-btn-icon">
                            <FiFileText />
                        </span>

                        <span className="document-btn-content">
                            <strong>
                                {downloading
                                    ? "Generating Transcript..."
                                    : "Academic Transcript"}
                            </strong>

                            <small>
                                Official PDF academic record
                            </small>
                        </span>

                        {downloading ? (
                            <Spinner
                                animation="border"
                                size="sm"
                            />
                        ) : (
                            <FiDownload />
                        )}
                    </button>

                    <button
                        type="button"
                        className="document-download-btn"
                        onClick={handleDownloadClearance}
                        disabled={
                            downloading ||
                            downloadingClearance ||
                            !isVerified
                        }
                    >
                        <span className="document-btn-icon">
                            <FiShield />
                        </span>

                        <span className="document-btn-content">
                            <strong>
                                {downloadingClearance
                                    ? "Generating Clearance..."
                                    : "Clearance Letter"}
                            </strong>

                            <small>
                                Official university clearance document
                            </small>
                        </span>

                        {downloadingClearance ? (
                            <Spinner
                                animation="border"
                                size="sm"
                            />
                        ) : (
                            <FiDownload />
                        )}
                    </button>

                </div>

            </section>

            {/* =================================================
                ATTENDANCE PERFORMANCE
            ================================================= */}

            {summary && (
                <section className="transcript-card attendance-performance-card">

                    <div className="section-header">

                        <div className="section-title-wrapper">

                            <div className="section-icon">
                                <FiAward />
                            </div>

                            <div>
                                <h2>Overall Attendance Performance</h2>

                                <p>
                                    Cumulative attendance throughout the
                                    academic program
                                </p>
                            </div>

                        </div>

                    </div>

                    <div className="attendance-performance">

                        <div className="attendance-rank">

                            <div className="rank-image-wrapper">
                                <img
                                    src={rank.img}
                                    alt={rank.name}
                                    className="rank-image"
                                />
                            </div>

                            <h3>{rank.name}</h3>

                            <span>
                                Attendance Rank
                            </span>

                        </div>

                        <div className="attendance-score">

                            <span>
                                Cumulative Attendance
                            </span>

                            <strong className={percentageClass}>
                                {attendancePercentage.toFixed(1)}%
                            </strong>

                            <div className="attendance-progress">
                                <div
                                    className={`attendance-progress-bar ${percentageClass}`}
                                    style={{
                                        width: `${Math.min(
                                            attendancePercentage,
                                            100
                                        )}%`,
                                    }}
                                />
                            </div>

                            <p>
                                {attendanceComment}
                            </p>

                        </div>

                    </div>

                </section>
            )}

            {/* =================================================
                FOOTER NOTE
            ================================================= */}

            <div className="transcript-footer">

                <FiMapPin />

                <span>
                    UNIOSUNTrack — University Attendance and Academic
                    Record System
                </span>

            </div>

        </Container>
    );
};

export default Transcript;