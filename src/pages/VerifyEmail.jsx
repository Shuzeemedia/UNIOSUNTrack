import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./VerifyEmail.css"; // separate CSS file

export default function VerifyEmail() {
    const navigate = useNavigate();
    const { token } = useParams();
    const hasFetched = useRef(false); // prevent double fetch

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const verifyUserEmail = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify-email/${token}`);

                if (response.ok) {
                    toast.success("Email verified successfully! You can now log in.", { position: "top-center" });
                    setTimeout(() => navigate("/login"), 2500);
                } else {
                    toast.error("Invalid or expired verification link. Please sign up again.", { position: "top-center" });
                    setTimeout(() => navigate("/signup"), 2500);
                }
            } catch (err) {
                console.error("Verification error:", err);
                toast.error("Something went wrong. Try again later.", { position: "top-center" });
                setTimeout(() => navigate("/signup"), 2500);
            }
        };

        verifyUserEmail();
    }, [token, navigate]);

    return (
        <div className="verify-container">
            <ToastContainer />
            <div className="verify-card">
                <h2>Verifying your email...</h2>
                <p>Please wait while we verify your account.</p>
            </div>
        </div>
    );
}
