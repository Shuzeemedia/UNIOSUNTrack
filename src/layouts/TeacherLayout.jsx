// src/layouts/TeacherLayout.jsx
import { Outlet } from "react-router-dom";
import TopNavbar from "../components/topnav/TopNavbar";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const TeacherLayout = () => {
    const { user } = useContext(AuthContext);

    return (
        <div className="student-layout">
            <TopNavbar user={user} />
            <main className="student-main">
                <Outlet />
            </main>
        </div>
    );
};

export default TeacherLayout;
