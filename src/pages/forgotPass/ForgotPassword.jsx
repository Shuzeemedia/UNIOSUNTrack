// src/pages/ForgotPassword.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api/api";
import { toast } from "react-toastify";
import "./ForgotPassword.css"; //Styled exactly like login.css

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email address");
    try {
      setLoading(true);
      await API.post("/auth/forgot-password", { email });
      toast.success("Password reset email sent! Check your inbox.");
      setEmail("");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-wrapper">
      <div className="forgot-card">
        {/* Header */}
        <div className="forgot-header">
          <img
            src="/ranks/uniosunlogo.png"
            alt="Uniosun Logo"
            className="forgot-logo"
          />
          <h3>Reset Your Password</h3>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input
              type="email"
              className="form-control-custom"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="forgot-btn" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {/* Links */}
        <div className="forgot-links text-muted">
          <p>
            <Link to="/login" className="forgot-link">
              ← Back to Login
            </Link>
          </p>
          <p>
            Don’t have an account?{" "}
            <Link to="/signup" className="forgot-link">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
