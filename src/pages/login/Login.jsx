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
  const [errors, setErrors] = useState({ email: "", password: "" });
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({ email: "", password: "" });

    try {
      const { data } = await API.post("/auth/login", { email, password });
      const { user, token } = data;

      localStorage.clear();
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);

      login(user, token);
      toast.success("Login successful");

      const role = user?.role?.toLowerCase();
      if (role === "teacher") navigate("/dashboard/teacher");
      else if (role === "student") navigate("/dashboard/student");
      else if (role === "admin") navigate("/admin/dashboard");
      else navigate("/");

    } catch (err) {
      const resData = err.response?.data;

      if (err.response?.status === 403 && resData?.msg) {
        toast.info(resData.msg);
        return;
      }

      if (resData?.field && resData?.msg) {
        setErrors((prev) => ({ ...prev, [resData.field]: resData.msg }));
      } else if (resData?.msg) {
        toast.error(resData.msg);
      } else {
        toast.error("Login failed");
      }
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
            {errors.email && <div className="input-error">{errors.email}</div>}
          </div>

          <div className="mb-3">
            <div className="password-input-group">
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
            {/* Error is now outside the flex wrapper */}
            {errors.password && <div className="input-error">{errors.password}</div>}
          </div>

          <button type="submit" className="login-btn btnz">
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
