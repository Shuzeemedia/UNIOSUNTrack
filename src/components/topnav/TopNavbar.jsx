import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { Navbar, Nav, Container, Dropdown } from "react-bootstrap";
import { FaChevronDown } from "react-icons/fa"; // using react-icons
import "./navbar.css"; // stylesheet

const TopNavbar = () => {
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);
    const [open, setOpen] = useState(false);

    const getInitials = (name) => {
        if (!name) return "U";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    };

    const getDashboardPath = () => {
        if (user?.role === "student") return "/dashboard/student";
        if (user?.role === "teacher") return "/dashboard/teacher";
        if (user?.role === "admin") return "/admin/dashboard";
        return "/login";
    };

    const getLeaderboardPath = () => {
        if (user?.role === "student") return "/student/leaderboard";
        if (user?.role === "teacher") return "/teacher/leaderboard";
        if (user?.role === "admin") return "/admin/leaderboard";
        return "/login";
    };

    return (
        <Navbar expand="lg" className="un-navbar shadow-sm">
            <Container fluid>
                <Navbar.Brand
                    className="fw-bold un-navbar-brand"
                    onClick={() => navigate(getDashboardPath())}
                    style={{ cursor: "pointer" }}
                >
                    <img src="/ranks/uniosunlogo.png" alt="Uniosun Logo" className="login-logo" />
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="basic-navbar-nav" className="border-0" />
                <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
                    <Nav className="align-items-center gap-3">
                        <Nav.Link
                            onClick={() => navigate(getDashboardPath())}
                            className="un-nav-link"
                        >
                            Dashboard
                        </Nav.Link>

                        <Nav.Link
                            onClick={() => navigate(getLeaderboardPath())}
                            className="un-nav-link"
                        >
                            Leaderboard
                        </Nav.Link>

                        {/* Profile Dropdown */}
                        <Dropdown show={open} onToggle={() => setOpen(!open)} align="end" autoClose="outside">

                            <Dropdown.Toggle
                                as="div"
                                className="d-flex align-items-center gap-2 cursor-pointer un-profile-toggle"
                                bsPrefix="custom-toggle"
                            >
                                <div className="profile-avatarX">
                                    {user?.profileImage ? (
                                        <img
                                            src={user.profileImage}
                                            alt="profile"
                                            className="rounded-circle"
                                        />
                                    ) : (
                                        <span className="profile-initialsX">{getInitials(user?.name)}</span>
                                    )}
                                </div>
                                <FaChevronDown size={14} /> {/*replaced icon */}
                            </Dropdown.Toggle>

                            <Dropdown.Menu className="un-dropdown-menu shadow-sm">
                                <Dropdown.Item
                                    onClick={() => {
                                        setOpen(false);
                                        navigate("/profile");
                                    }}
                                >
                                    Account Settings
                                </Dropdown.Item>
                                <Dropdown.Item
                                    className="text-danger"
                                    onClick={() => {
                                        setOpen(false);
                                        logout();
                                        navigate("/login");
                                    }}
                                >
                                    Logout
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default TopNavbar;
