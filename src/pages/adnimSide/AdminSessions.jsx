import React, { useEffect, useState } from "react";
import { Button, Table, Spinner, Modal, Form, InputGroup, FormControl, Pagination } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../../api/api";
import "./adminSessions.css"; 


const AdminSessions = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: "", startDate: "", endDate: "" });
    const [editingSession, setEditingSession] = useState(null);

    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const perPage = 20;

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const res = await api.get("/session");
            setSessions(res.data);
        } catch (err) {
            toast.error("Failed to fetch sessions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const openCreateModal = () => {
        setEditingSession(null);
        setFormData({ name: "", startDate: "", endDate: "" });
        setShowModal(true);
    };

    const openEditModal = (session) => {
        setEditingSession(session);
        setFormData({
            name: session.name,
            startDate: session.startDate.slice(0, 10),
            endDate: session.endDate.slice(0, 10),
        });
        setShowModal(true);
    };

    const submitSession = async (e) => {
        e.preventDefault();
        try {
            if (editingSession) {
                await api.put(`/session/${editingSession._id}`, formData);
                toast.success("Session updated!");
            } else {
                await api.post("/session/create", formData);
                toast.success("New session started and students promoted!");
            }
            setShowModal(false);
            fetchSessions();
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to save session");
        }
    };

    const deleteSession = async (id) => {
        if (!window.confirm("Are you sure you want to delete this session?")) return;
        try {
            await api.delete(`/session/${id}`);
            toast.success("Session deleted");
            fetchSessions();
        } catch (err) {
            toast.error("Failed to delete session");
        }
    };

    const activateSession = async (id) => {
        try {
            await api.patch(`/session/${id}/activate`);
            toast.success("Session activated");
            fetchSessions();
        } catch (err) {
            toast.error("Failed to activate session");
        }
    };

    // Search filter
    const filteredSessions = sessions.filter(
        s => s.name.toLowerCase().includes(search.toLowerCase())
    );

    // Pagination
    const totalPages = Math.ceil(filteredSessions.length / perPage);
    const paginatedSessions = filteredSessions.slice(
        (currentPage - 1) * perPage,
        currentPage * perPage
    );

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h3>Manage Academic Sessions</h3>
                <Button onClick={openCreateModal}>Start New Session</Button>
            </div>

            <InputGroup className="mb-3">
                <FormControl
                    placeholder="Search session by name..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                />
            </InputGroup>

            {loading ? (
                <div className="text-center my-4">
                    <Spinner animation="border" />
                </div>
            ) : (
                <>
                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Active</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedSessions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center">No sessions found</td>
                                </tr>
                            ) : (
                                paginatedSessions.map(s => (
                                    <tr key={s._id} className={s.active ? "table-success" : ""}>
                                        <td>{s.name}</td>
                                        <td>{new Date(s.startDate).toLocaleDateString()}</td>
                                        <td>{new Date(s.endDate).toLocaleDateString()}</td>
                                        <td>
                                            {s.active
                                                ? <span className="badge bg-success">Active</span>
                                                : <span className="badge bg-secondary">Inactive</span>
                                            }
                                        </td>
                                        <td>
                                            <div className="d-flex flex-wrap gap-1" style={{ position: "relative", zIndex: 1 }}>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() => openEditModal(s)}
                                                    // disabled={s.active}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={() => deleteSession(s._id)}
                                                    disabled={s.active}
                                                >
                                                    Delete
                                                </Button>
                                                {!s.active && (
                                                    <Button
                                                        size="sm"
                                                        variant="success"
                                                        onClick={() => activateSession(s._id)}
                                                    >
                                                        Activate
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>


                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Pagination className="justify-content-center">
                            {Array.from({ length: totalPages }, (_, i) => (
                                <Pagination.Item
                                    key={i + 1}
                                    active={i + 1 === currentPage}
                                    onClick={() => setCurrentPage(i + 1)}
                                >
                                    {i + 1}
                                </Pagination.Item>
                            ))}
                        </Pagination>
                    )}
                </>
            )}

            {/* Start/Edit Session Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{editingSession ? "Edit Session" : "Start New Session"}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={submitSession}>
                        <Form.Group className="mb-2">
                            <Form.Label>Session Name</Form.Label>
                            <Form.Control type="text" name="name" value={formData.name} onChange={handleChange} placeholder="2025/2026" required />
                        </Form.Group>
                        <Form.Group className="mb-2">
                            <Form.Label>Start Date</Form.Label>
                            <Form.Control type="date" name="startDate" value={formData.startDate} onChange={handleChange} required />
                        </Form.Group>
                        <Form.Group className="mb-2">
                            <Form.Label>End Date</Form.Label>
                            <Form.Control type="date" name="endDate" value={formData.endDate} onChange={handleChange} required />
                        </Form.Group>
                        <Button type="submit">{editingSession ? "Update Session" : "Start Session"}</Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default AdminSessions;
