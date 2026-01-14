import React, { useEffect, useState } from "react";
import { Button, Table, Spinner, Form } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../../api/api";
import SemesterForm from "../adnimSide/SemesterForm";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import "./adminSemesters.css";


const AdminSemesters = () => {
    const [semesters, setSemesters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingSemester, setEditingSemester] = useState(null);

    // pagination states
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);

    // search & filter states
    const [search, setSearch] = useState("");
    const [seasonFilter, setSeasonFilter] = useState("");
    const [activeFilter, setActiveFilter] = useState("");

    const limit = 20;

    // FETCH semesters with pagination + search + filtering
    const fetchSemesters = async () => {
        setLoading(true);
        try {
            const res = await api.get(
                `/semesters/paged?page=${page}&limit=${limit}&search=${search}`
            );

            let filtered = res.data.semesters;

            // apply filters
            if (seasonFilter)
                filtered = filtered.filter((s) => s.season === seasonFilter);

            if (activeFilter !== "")
                filtered = filtered.filter(
                    (s) => String(s.active) === String(activeFilter)
                );

            setSemesters(filtered);
            setPages(res.data.pages);
        } catch (err) {
            toast.error("Failed to load semesters");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSemesters();
    }, [page, search, seasonFilter, activeFilter]);

    // DELETE semester
    const deleteSemester = async (id) => {
        if (!window.confirm("Are you sure you want to delete this semester?")) return;

        try {
            await api.delete(`/semesters/${id}`);
            toast.success("Semester deleted");
            fetchSemesters();
        } catch (err) {
            toast.error("Failed to delete semester");
        }
    };

    // SET ACTIVE SEMESTER
    const activateSemester = async (id) => {
        try {
            await api.put(`/semesters/activate/${id}`);
            toast.success("Semester activated");
            fetchSemesters();
        } catch (err) {
            toast.error("Failed to activate");
        }
    };

    const openCreateForm = () => {
        setEditingSemester(null);
        setShowForm(true);
    };

    const openEditForm = (sem) => {
        setEditingSemester(sem);
        setShowForm(true);
    };

    return (
        <div className="container mt-4">

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center">
                <h3>Manage Semesters</h3>
                <Button onClick={openCreateForm}>Add Semester</Button>
            </div>

            <hr />

            {/* SEARCH & FILTERS */}
            <div className="d-flex gap-3 mb-3">
                <Form.Control
                    style={{ maxWidth: "250px" }}
                    placeholder="Search by name..."
                    value={search}
                    onChange={(e) => {
                        setPage(1);
                        setSearch(e.target.value);
                    }}
                />

                <Form.Select
                    style={{ maxWidth: "200px" }}
                    value={seasonFilter}
                    onChange={(e) => {
                        setPage(1);
                        setSeasonFilter(e.target.value);
                    }}
                >
                    <option value="">All Seasons</option>
                    <option value="Harmattan">Harmattan</option>
                    <option value="Rain">Rain</option>
                </Form.Select>

                <Form.Select
                    style={{ maxWidth: "200px" }}
                    value={activeFilter}
                    onChange={(e) => {
                        setPage(1);
                        setActiveFilter(e.target.value);
                    }}
                >
                    <option value="">All Status</option>
                    <option value={true}>Active</option>
                    <option value={false}>Inactive</option>
                </Form.Select>
            </div>

            {/* TABLE */}
            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="sem-table-wrapper">
                    <Table striped bordered hover className="sem-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Season</th>
                                <th>Start</th>
                                <th>End</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {semesters.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center empty-text">
                                        No semesters found
                                    </td>
                                </tr>
                            ) : (
                                semesters.map((sem) => (
                                    <tr key={sem._id}>
                                        <td className="cell-text name-text">{sem.name}</td>

                                        <td className="cell-text">{sem.season}</td>

                                        <td className="cell-text">
                                            {new Date(sem.startDate).toLocaleDateString()}
                                        </td>

                                        <td className="cell-text">
                                            {new Date(sem.endDate).toLocaleDateString()}
                                        </td>

                                        <td>
                                            {sem.active ? (
                                                <span className="status-badge active">Active</span>
                                            ) : (
                                                <span className="status-badge inactive">Inactive</span>
                                            )}
                                        </td>

                                        <td className="action-col">
                                            {!sem.active && (
                                                <Button
                                                    size="sm"
                                                    variant="success"
                                                    className="action-btn"
                                                    onClick={() => activateSemester(sem._id)}
                                                >
                                                    Set Active
                                                </Button>
                                            )}

                                            <Button
                                                size="sm"
                                                variant="primary"
                                                className="action-btn"
                                                onClick={() => openEditForm(sem)}
                                            >
                                                Edit
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="danger"
                                                className="action-btn"
                                                onClick={() => deleteSemester(sem._id)}
                                            >
                                                Delete
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>

            )}

            {/* PAGINATION */}
            {pages > 1 && (
                <div className="d-flex justify-content-center mt-3">
                    <Button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="me-2"
                    >
                        Prev
                    </Button>

                    <span className="align-self-center">
                        Page {page} of {pages}
                    </span>

                    <Button
                        disabled={page === pages}
                        onClick={() => setPage(page + 1)}
                        className="ms-2"
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* FORM MODAL */}
            <SemesterForm
                show={showForm}
                onHide={() => setShowForm(false)}
                fetchSemesters={fetchSemesters}
                editingSemester={editingSemester}
            />
        </div>
    );
};

export default AdminSemesters;