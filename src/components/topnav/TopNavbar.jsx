import React, { useContext, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    FaChevronDown,
    FaTachometerAlt,
    FaTrophy,
    FaUserCog,
    FaSignOutAlt,
    FaUserCircle,
} from "react-icons/fa";
import { Navbar, Nav, Container, Dropdown } from "react-bootstrap";

import { AuthContext } from "../../context/AuthContext";
import FaceVerificationModal from "../../components/FaceVerificationModal";

import "./navbar.css";

const TopNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const { user, logout } = useContext(AuthContext);

    const [open, setOpen] = useState(false);
    const [showFaceModal, setShowFaceModal] = useState(false);

    // =====================================================
    // Helpers
    // =====================================================

    const getInitials = (name) => {
        if (!name) return "U";

        const parts = name.trim().split(/\s+/);

        if (parts.length === 1) {
            return parts[0][0].toUpperCase();
        }

        return (
            parts[0][0] + parts[parts.length - 1][0]
        ).toUpperCase();
    };

    const getDashboardPath = () => {
        switch (user?.role) {
            case "student":
                return "/dashboard/student";

            case "teacher":
                return "/dashboard/teacher";

            case "admin":
                return "/admin/dashboard";

            default:
                return "/login";
        }
    };

    const getLeaderboardPath = () => {
        switch (user?.role) {
            case "student":
                return "/student/leaderboard";

            case "teacher":
                return "/teacher/leaderboard";

            case "admin":
                return "/admin/leaderboard";

            default:
                return "/login";
        }
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    const handleNavigation = (path) => {
        setOpen(false);
        navigate(path);
    };

    const handleAccountSettings = () => {
        setOpen(false);

        if (user?.role === "student") {
            setShowFaceModal(true);
        } else {
            navigate("/profile");
        }
    };

    const handleLogout = () => {
        setOpen(false);
        logout();
        navigate("/login");
    };

    const roleLabel = user?.role
        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
        : "User";

    return (
        <>
            <Navbar
                expand="lg"
                className="un-navbar"
            >
                <Container fluid className="un-navbar-container">

                    {/* =================================================
                        BRAND
                    ================================================= */}
                    <Navbar.Brand
                        className="un-navbar-brand"
                        onClick={() =>
                            handleNavigation(getDashboardPath())
                        }
                        aria-label="Go to dashboard"
                    >
                        <img
                            src="/ranks/uniosunlogo.png"
                            alt="UNIOSUN Logo"
                            className="un-navbar-logo"
                        />

                        <div className="un-brand-text">
                            <strong>UNIOSUNTrack</strong>
                            <span>UNIOSUN Attendance System</span>
                        </div>
                    </Navbar.Brand>

                    {/* =================================================
                        MOBILE TOGGLE
                    ================================================= */}
                    <Navbar.Toggle
                        aria-controls="un-navbar-nav"
                        className="un-navbar-toggle"
                    />

                    <Navbar.Collapse
                        id="un-navbar-nav"
                        className="un-navbar-collapse"
                    >

                        {/* =================================================
                            NAVIGATION
                        ================================================= */}
                        <Nav className="un-main-nav">

                            <Nav.Link
                                onClick={() =>
                                    handleNavigation(getDashboardPath())
                                }
                                className={`un-nav-link ${isActive(getDashboardPath())
                                        ? "active"
                                        : ""
                                    }`}
                            >
                                <FaTachometerAlt />

                                <span>
                                    Dashboard
                                </span>
                            </Nav.Link>

                            <Nav.Link
                                onClick={() =>
                                    handleNavigation(getLeaderboardPath())
                                }
                                className={`un-nav-link ${isActive(getLeaderboardPath())
                                        ? "active"
                                        : ""
                                    }`}
                            >
                                <FaTrophy />

                                <span>
                                    Leaderboard
                                </span>
                            </Nav.Link>

                        </Nav>

                        {/* =================================================
                            PROFILE
                        ================================================= */}
                        <Nav className="un-profile-nav">

                            <Dropdown
                                show={open}
                                onToggle={(nextShow) =>
                                    setOpen(nextShow)
                                }
                                align="end"
                                autoClose="outside"
                            >

                                <Dropdown.Toggle
                                    as="button"
                                    className="un-profile-toggle"
                                    bsPrefix="custom-profile-toggle"
                                    aria-label="Open account menu"
                                >

                                    <div className="un-profile-avatar">

                                        {user?.profileImage ? (
                                            <img
                                                src={user.profileImage}
                                                alt={user?.name || "Profile"}
                                                onError={(e) => {
                                                    e.currentTarget.style.display =
                                                        "none";
                                                }}
                                            />
                                        ) : (
                                            <span>
                                                {getInitials(user?.name)}
                                            </span>
                                        )}

                                    </div>

                                    <div className="un-profile-details">
                                        <strong>
                                            {user?.name || "User"}
                                        </strong>

                                        <span>
                                            {roleLabel}
                                        </span>
                                    </div>

                                    <FaChevronDown
                                        className={`un-profile-chevron ${open ? "rotate" : ""
                                            }`}
                                    />

                                </Dropdown.Toggle>

                                <Dropdown.Menu className="un-dropdown-menu">

                                    {/* Profile heading */}
                                    <div className="un-dropdown-header">

                                        <div className="un-dropdown-avatar">

                                            {user?.profileImage ? (
                                                <img
                                                    src={user.profileImage}
                                                    alt={user?.name || "Profile"}
                                                />
                                            ) : (
                                                <FaUserCircle />
                                            )}

                                        </div>

                                        <div>
                                            <strong>
                                                {user?.name || "User"}
                                            </strong>

                                            <span>
                                                {user?.email || roleLabel}
                                            </span>
                                        </div>

                                    </div>

                                    <Dropdown.Divider />

                                    {/* Account Settings */}
                                    <Dropdown.Item
                                        onClick={handleAccountSettings}
                                    >
                                        <FaUserCog />

                                        <span>
                                            Account Settings
                                        </span>
                                    </Dropdown.Item>

                                    <Dropdown.Divider />

                                    {/* Logout */}
                                    <Dropdown.Item
                                        className="un-logout-item"
                                        onClick={handleLogout}
                                    >
                                        <FaSignOutAlt />

                                        <span>
                                            Logout
                                        </span>
                                    </Dropdown.Item>

                                </Dropdown.Menu>

                            </Dropdown>

                        </Nav>

                    </Navbar.Collapse>

                </Container>
            </Navbar>

            {/* =====================================================
                FACE VERIFICATION
            ===================================================== */}
            <FaceVerificationModal
                show={showFaceModal}
                onClose={() => setShowFaceModal(false)}
                user={user}
                onVerified={() => {
                    setShowFaceModal(false);
                    navigate("/profile");
                }}
            />
        </>
    );
};

export default TopNavbar;