import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/api";
import { toast } from "react-toastify";
import "./signupPage.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Signup = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    studentId: "",
    departmentId: "",
    level: "",
    email: "",
    password: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [levels, setLevels] = useState([]);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data } = await API.get("/departments");
        setDepartments(data);
      } catch {
        toast.error("Failed to load departments");
      }
    };

    fetchDepartments();
  }, []);

  const evaluatePasswordStrength = (password) => {
    let score = 0;

    if (password.length >= 6) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&#]/.test(password)) score++;

    if (score <= 2)
      setPasswordStrength({
        score,
        label: "Weak",
      });
    else if (score <= 4)
      setPasswordStrength({
        score,
        label: "Medium",
      });
    else
      setPasswordStrength({
        score,
        label: "Strong",
      });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFormErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    if (name === "departmentId") {
      const selectedDept = departments.find(
        (dept) => dept._id === value
      );

      setLevels(selectedDept ? selectedDept.levels : []);

      setFormData((prev) => ({
        ...prev,
        level: "",
      }));
    }

    if (name === "password") {
      evaluatePasswordStrength(value);
    }
  };

  const validateForm = () => {
    const errors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    const studentIdRegex = /^\d{4}\/\d{5}$/;

    if (!formData.name.trim())
      errors.name = "Name is required";

    if (!studentIdRegex.test(formData.studentId))
      errors.studentId =
        "Format should be e.g. 2021/42049";

    if (!formData.departmentId)
      errors.departmentId =
        "Select a department";

    if (!formData.level)
      errors.level = "Select your level";

    if (!emailRegex.test(formData.email))
      errors.email = "Invalid email format";

    if (!passwordRegex.test(formData.password))
      errors.password =
        "Min 8 chars, include upper, lower & number";

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      await API.post("/auth/signup", formData);

      toast.success(
        "Signup successful! Check your email for verification."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1800);
    } catch (err) {
      toast.error(
        err.response?.data?.msg || "Signup failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-wrapper">

      {/* LEFT SIDE */}

      <div className="login-showcase">

        <img
          src="/ranks/uniosunlogo.png"
          alt="UNIOSUN"
          className="showcase-logo"
        />

        <h1>UNIOSUNTrack</h1>

        <p className="showcase-text">
          Smart Attendance Management System
        </p>

        <div className="showcase-features">

          <div>✓ Biometric Face Verification</div>

          <div>✓ Secure QR Authentication</div>

          <div>✓ GPS Geofencing</div>

          <div>✓ Real-time Attendance Monitoring</div>

        </div>

      </div>

      {/* RIGHT SIDE */}

      <div className="login-card">

        <div className="login-header">

          <img
            src="/ranks/uniosunlogo.png"
            alt="UNIOSUN"
            className="login-logo"
          />

          <div>

            <h3>Create Account</h3>

            <p className="login-subtitle small">
              Create your UNIOSUNTrack account.
            </p>

          </div>

        </div>

        <form
          onSubmit={handleSubmit}
          className="signup-form"
        >

          <div className="form-group">

            {/* <label>Full Name</label> */}

            <input
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              className="form-control-custom"
            />

            {formErrors.name && (
              <small className="input-error">
                {formErrors.name}
              </small>
            )}

          </div>

          <div className="form-group">

            {/* <label>Student ID</label> */}

            <input
              type="text"
              name="studentId"
              placeholder="2021/42049"
              value={formData.studentId}
              onChange={handleChange}
              className="form-control-custom"
            />

            {formErrors.studentId && (
              <small className="input-error">
                {formErrors.studentId}
              </small>
            )}

          </div>

          <div className="form-group">

            {/* <label>Department</label> */}

            <select
              name="departmentId"
              value={formData.departmentId}
              onChange={handleChange}
              className="form-control-custom"
            >

              <option value="">
                Select Department
              </option>

              {departments.map((dept) => (
                <option
                  key={dept._id}
                  value={dept._id}
                >
                  {dept.name}
                </option>
              ))}

            </select>

            {formErrors.departmentId && (
              <small className="input-error">
                {formErrors.departmentId}
              </small>
            )}

          </div>

          <div className="form-group">

            {/* <label>Level</label> */}

            <select
              name="level"
              value={formData.level}
              onChange={handleChange}
              disabled={!levels.length}
              className="form-control-custom"
            >

              <option value="">
                Select Level
              </option>

              {levels.map((lvl) => (
                <option
                  key={lvl}
                  value={lvl}
                >
                  {lvl} Level
                </option>
              ))}

            </select>

            {formErrors.level && (
              <small className="input-error">
                {formErrors.level}
              </small>
            )}

          </div>

          <div className="form-group">

            {/* <label>Email Address</label> */}

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              className="form-control-custom"
            />

            {formErrors.email && (
              <small className="input-error">
                {formErrors.email}
              </small>
            )}

          </div>

          <div className="form-group">

            {/* <label>Password</label> */}

            <div className="password-input-group">

              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                className="form-control-custom pass"
              />

              <button
                type="button"
                className="password-toggle-btns"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
              >
                {showPassword ? (
                  <FaEyeSlash />
                ) : (
                  <FaEye />
                )}
              </button>

            </div>

            {formErrors.password && (
              <small className="input-error">
                {formErrors.password}
              </small>
            )}

          </div>

          {formData.password && (
            <div className="password-strength full-width">

              <div className="strength-track">

                <div
                  className={`strength-fill ${passwordStrength.label.toLowerCase()}`}
                ></div>

              </div>

              <small className="strength-label">
                Password Strength:
                <span> {passwordStrength.label}</span>
              </small>

            </div>
          )}

          <button
            type="submit"
            className="signup-btn full-width"
            disabled={loading}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                />
                Creating Account...
              </>
            ) : (
              <>
                Create Account
                {/* <span className="ms-2">→</span> */}
              </>
            )}
          </button>

        </form>

        <div className="login-links full-width">

          <p className="text-muted small">

            By creating an account, you agree to our
            <strong> Terms of Service</strong> and
            <strong> Privacy Policy</strong>.

          </p>

          <p className="text-muted small">

            Already have an account?

            <Link
              to="/login"
              className="login-link ms-2"
            >
              Sign In
            </Link>

          </p>

        </div>

      </div>

    </div>
  );

};

export default Signup;

