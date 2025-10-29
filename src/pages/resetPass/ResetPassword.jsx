import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../../api/api";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "./resetPassword.css";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirm)
      return toast.error("Passwords do not match");

    if (!passwordRegex.test(password))
      return toast.error(
        "Password must be at least 8 characters, include uppercase, lowercase, and a number"
      );

    try {
      await API.post(`/auth/reset-password/${token}`, { password });
      toast.success("Password reset successful! Please log in.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Invalid or expired reset link");
    }
  };

  return (
    <div className="reset-wrapper">
      <div className="reset-card">
        <div className="reset-header">
          <img src="/ranks/uniosunlogo.png" alt="Uniosun Logo" className="reset-logo" />
          <h3>Reset Password</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3 password-input-group">
            <input
              type={showPassword ? "text" : "password"}
              className="form-control-custom pass"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div className="mb-3 password-input-group">
            <input
              type={showConfirm ? "text" : "password"}
              className="form-control-custom pass"
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <button type="submit" className="reset-btn">
            Reset Password
          </button>
        </form>

        <div className="reset-links text-muted">
          <p>
            Remembered your password?{" "}
            <a href="/login" className="reset-link">
              Login here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
