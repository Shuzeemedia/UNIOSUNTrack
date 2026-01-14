import { useEffect, useState, useContext } from "react";
import { Container, Table, Button, Badge, Spinner, Alert, Card } from "react-bootstrap";
import api from "../../api/api";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import "./adminSemesters.css";


const GraduateVerification = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [graduates, setGraduates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState("");
    const [selectedYear, setSelectedYear] = useState("all");
    const [availableYears, setAvailableYears] = useState([]);


    // ==============================
    // AUTH GUARD
    // ==============================
    useEffect(() => {
        if (!user) return;

        if (user.role !== "admin") {
            navigate("/login");
            return;
        }

        fetchGraduates();
    }, [user]);

    // ==============================
    // FETCH GRADUATES
    // ==============================
    const fetchGraduates = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/graduates");
            setGraduates(res.data);

            // ✅ Extract unique graduation years
            const years = res.data
                .map(g =>
                    g.graduationDate
                        ? new Date(g.graduationDate).getFullYear()
                        : null
                )
                .filter(Boolean);

            const uniqueYears = [...new Set(years)].sort((a, b) => b - a);
            setAvailableYears(uniqueYears);

        } catch (err) {
            setError("Failed to load graduated students");
        } finally {
            setLoading(false);
        }
    };


    // ==============================
    // VERIFY GRADUATE
    // ==============================
    const verifyGraduate = async (id) => {
        try {
            setActionLoading(id);
            await api.put(`/admin/verify/${id}`);
            fetchGraduates();
        } catch (err) {
            alert("Verification failed");
        } finally {
            setActionLoading(null);
        }
    };

    // ==============================
    // REVOKE VERIFICATION
    // ==============================
    const revokeGraduate = async (id) => {
        if (!window.confirm("Are you sure you want to revoke verification?")) return;

        try {
            setActionLoading(id);
            await api.put(`/admin/revoke/${id}`);
            fetchGraduates();
        } catch (err) {
            alert("Revoke failed");
        } finally {
            setActionLoading(null);
        }
    };

    // ==============================
    // UI STATES
    // ==============================
    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <Container className="mt-5">
                <Alert variant="danger">{error}</Alert>
            </Container>
        );
    }

    const filteredGraduates =
        selectedYear === "all"
            ? graduates
            : graduates.filter(g =>
                g.graduationDate &&
                new Date(g.graduationDate).getFullYear().toString() === selectedYear
            );


    return (
        <Container className="py-4">
            <Card className="shadow-sm">
                <Card.Body>
                    <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">

                        <div>
                            <label htmlFor="gradYearFilter" className="form-label fw-semibold">
                                Filter by Graduation Year
                            </label>

                            <select
                                id="gradYearFilter"
                                className="form-select"
                                style={{ maxWidth: "220px" }}
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                aria-label="Filter graduates by graduation year"
                            >
                                <option value="all">All Years</option>

                                {availableYears.map(year => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="text-muted small">
                            Showing <strong>{filteredGraduates.length}</strong> result(s)
                        </div>

                    </div>

                    <h4 className="fw-bold text-success mb-3">
                        🎓 Graduate Verification Panel
                    </h4>

                    <div className="gv-table-wrapper">
                        <Table bordered hover className="gv-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Name</th>
                                    <th>Matric No</th>
                                    <th>Department</th>
                                    <th>Graduation Date</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredGraduates.length === 0 && (

                                    <tr>
                                        <td colSpan="7" className="text-center empty-text">
                                            No graduated students found
                                        </td>
                                    </tr>
                                )}

                                {filteredGraduates.map((g, index) => (

                                    <tr key={g._id}>
                                        <td className="cell-text">{index + 1}</td>

                                        <td className="cell-text name-text">{g.name}</td>

                                        <td className="cell-text">{g.studentId}</td>

                                        <td className="cell-text">
                                            {g.department?.name || "-"}
                                        </td>

                                        <td className="cell-text">
                                            {g.graduationDate
                                                ? new Date(g.graduationDate).toLocaleDateString()
                                                : "N/A"}
                                        </td>

                                        <td>
                                            {g.graduationVerified ? (
                                                <Badge bg="success" className="status-badge">
                                                    Verified
                                                </Badge>
                                            ) : (
                                                <Badge bg="warning" text="dark" className="status-badge">
                                                    Pending
                                                </Badge>
                                            )}
                                        </td>

                                        <td className="action-col">
                                            {g.graduationVerified ? (
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    className="action-btn"
                                                    disabled={actionLoading === g._id}
                                                    onClick={() => revokeGraduate(g._id)}
                                                >
                                                    {actionLoading === g._id ? "..." : "Revoke"}
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    className="action-btn"
                                                    disabled={actionLoading === g._id}
                                                    onClick={() => verifyGraduate(g._id)}
                                                >
                                                    {actionLoading === g._id ? "..." : "Verify"}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>

                </Card.Body>
            </Card>
        </Container>
    );
};

export default GraduateVerification;