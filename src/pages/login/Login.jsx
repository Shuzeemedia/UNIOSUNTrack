import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../../api/api";
import { AuthContext } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "./login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data } = await API.post("/auth/login", { email, password });
      const { user, token } = data;

      // Always clear previous data before saving new one
      localStorage.clear();
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);

      // Update context
      login(user, token);
      toast.success("Login successful");

      // Redirect by role
      const role = user?.role?.toLowerCase();
      if (role === "teacher") navigate("/dashboard/teacher");
      else if (role === "student") navigate("/dashboard/student");
      else if (role === "admin") navigate("/admin/dashboard");
      else navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Login failed");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <img src="/ranks/uniosunlogo.png" alt="Uniosun Logo" className="login-logo" />
          <h3>Welcome Back</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input
              type="email"
              className="form-control-custom"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-3 password-input-group">
            <input
              type={showPassword ? "text" : "password"}
              className="form-control-custom pass"
              placeholder="Password"
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

          <button type="submit" className="login-btn">
            Login
          </button>
        </form>

        <div className="login-links text-muted">
          <p>
            <Link to="/forgot-password" className="login-link">
              Forgot your password?
            </Link>
          </p>
          <p>
            Don’t have an account?{" "}
            <Link to="/signup" className="login-link">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
