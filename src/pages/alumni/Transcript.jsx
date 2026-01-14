import { useEffect, useState, useContext } from "react";
import { Container, Table, Alert, Spinner, Card } from "react-bootstrap";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/api";
import { useNavigate } from "react-router-dom";
import { getRankByPercentage } from "../../utils/getRankByPercentage";
import "./trans.css"; // Styled like login.css
import LoadingSpinner from "../../components/Loader/LoadingSpinner";



const Transcript = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [student, setStudent] = useState(null);
    const [transcript, setTranscript] = useState([]);
    const [summary, setSummary] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const [downloadingClearance, setDownloadingClearance] = useState(false);


    const getPercentageColor = (percentage) => {
        if (percentage < 45) return "text-danger";
        if (percentage < 70) return "text-warning";
        return "text-success";
    };


    const getAttendanceComment = (percentage, rankName) => {
        if (percentage >= 90)
            return "Outstanding attendance record. The student demonstrated exceptional consistency and commitment throughout the academic program.";

        if (percentage >= 75)
            return "Very good attendance performance. The student maintained a strong and reliable presence during academic sessions.";

        if (percentage >= 60)
            return "Satisfactory attendance performance. The student met the minimum attendance expectations.";

        if (percentage >= 45)
            return "Fair attendance record. Improvement in consistency would have enhanced academic engagement.";

        return "Poor attendance record. The student’s attendance fell below acceptable academic standards.";
    };

    const handleDownloadPdf = async () => {
        try {
            setDownloading(true);

            const res = await api.get("/alumni/transcript/pdf", {
                responseType: "blob",
            });

            const blob = new Blob([res.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `Transcript_${student?.name || "document"}.pdf`;

            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("Failed to download transcript PDF");
        } finally {
            setDownloading(false);
        }
    };


    const handleDownloadClearance = async () => {
        try {
            setDownloadingClearance(true);

            const res = await api.get("/alumni/clearance-letter/pdf", {
                responseType: "blob",
            });

            const blob = new Blob([res.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `Clearance_${student?.name || "student"}.pdf`;

            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("Failed to download clearance letter");
        } finally {
            setDownloadingClearance(false);
        }
    };




    useEffect(() => {
        //Guard: must be logged in
        if (!user) return;

        //Non-graduates are redirected
        if (!user.graduated) {
            navigate("/student/dashboard", {
                state: { msg: "Transcript available only after graduation" },
            });
            return;
        }

        fetchTranscript();
    }, [user]);

    const fetchTranscript = async () => {
        try {
            setLoading(true);

            const res = await api.get("/alumni/transcript");

            setStudent(res.data.student);
            setTranscript(res.data.transcript || []);
            setSummary(res.data.academicSummary);
        } catch (err) {
            console.error(err);
            setError(
                err.response?.data?.msg || "Failed to load transcript"
            );
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;


    if (error) {
        return (
            <Container className="mt-5">
                <Alert variant="danger">{error}</Alert>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            {/* ================= STUDENT INFO ================= */}
            <Card className="mb-4 shadow-sm">
                <Card.Body>
                    <h4 className="fw-bold text-success">🎓 Academic Transcript</h4>
                    <hr />

                    <p><strong>Name:</strong> {student.name}</p>
                    <p><strong>Student ID:</strong> {student.studentId}</p>
                    <p><strong>Department:</strong> {student.department}</p>
                    <p>
                        <strong>Graduation Date:</strong>{" "}
                        {student.graduationDate
                            ? new Date(student.graduationDate).toLocaleDateString()
                            : "N/A"}
                    </p>

                    <p>
                        <strong>Verification Status:</strong>{" "}
                        {student.graduationVerified ? (
                            <span className="badge bg-success ms-2">
                                Verified by University
                            </span>
                        ) : (
                            <span className="badge bg-warning text-dark ms-2">
                                Pending Verification
                            </span>
                        )}
                    </p>


                    <button
                        className="btn btn-success d-flex align-items-center gap-2"
                        onClick={handleDownloadPdf}
                        disabled={downloading || !student.graduationVerified}

                    >
                        {downloading && (
                            <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                            />
                        )}

                        {!student.graduationVerified
                            ? "Transcript Pending Verification"
                            : downloading
                                ? "Downloading..."
                                : "Download Transcript PDF"}

                    </button>

                    <button
                        className="btn btn-success d-flex align-items-center gap-2 mt-2"
                        onClick={handleDownloadClearance}
                        disabled={downloadingClearance || !student.graduationVerified}
                    >
                        {downloadingClearance && (
                            <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                            />
                        )}

                        {!student.graduationVerified
                            ? "Clearance Pending Verification"
                            : downloading
                                ? "Downloading..."
                                : "Download Clearance PDF"}

                    </button>


                </Card.Body>
            </Card>

            {!student.graduationVerified && (
                <Alert variant="warning" className="mt-3">
                    Your graduation record is pending administrative verification.
                    Official use of this transcript may be restricted until verification is completed.
                </Alert>
            )}


            {/* ================= ATTENDANCE SUMMARY ================= */}
            {summary && (() => {
                const rank = getRankByPercentage(summary.attendancePercentage);
                const colorClass = getPercentageColor(summary.attendancePercentage);
                const comment = getAttendanceComment(
                    summary.attendancePercentage,
                    rank.name
                );

                return (
                    <Card className="mb-4 shadow-sm text-center">
                        <Card.Body>
                            <h5 className="fw-semibold float_left text-success mb-4">
                                Overall Attendance Performance
                            </h5>

                            <img
                                src={rank.img}
                                alt={rank.name}
                                style={{ width: "200px", height: "200px" }}
                                className="mb-3"
                            />

                            <h4 className="fw-bold">{rank.name}</h4>

                            <p className="text-muted mt-2 mb-1">
                                Cumulative Attendance Percentage
                            </p>

                            <h2 className={`fw-bold ${colorClass}`}>
                                {summary.attendancePercentage}%
                            </h2>

                            <hr />

                            <p className="fst-italic text-muted px-3">
                                {comment}
                            </p>
                        </Card.Body>
                    </Card>
                );
            })()}


        </Container>
    );
};

export default Transcript;
