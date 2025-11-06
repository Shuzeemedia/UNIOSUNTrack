import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/api";
import { toast } from "react-toastify";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  InputGroup,
} from "react-bootstrap";
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
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); // <-- NEW STATE for button interaction

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: "" }));

    if (name === "departmentId") {
      const selectedDept = departments.find((d) => d._id === value);
      setLevels(selectedDept ? selectedDept.levels : []);
      setFormData((prev) => ({ ...prev, level: "" }));
    }

    if (name === "password") evaluatePasswordStrength(value);
  };

  const evaluatePasswordStrength = (password) => {
    let score = 0;
    if (password.length >= 6) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&#]/.test(password)) score++;

    if (score <= 2) setPasswordStrength({ score, label: "Weak" });
    else if (score <= 4) setPasswordStrength({ score, label: "Medium" });
    else setPasswordStrength({ score, label: "Strong" });
  };

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    const studentIdRegex = /^\d{4}\/\d{5}$/;

    if (!formData.name.trim()) errors.name = "Name is required";
    if (!studentIdRegex.test(formData.studentId))
      errors.studentId = "Format should be e.g. 2021/42049";
    if (!formData.departmentId) errors.departmentId = "Select a department";
    if (!formData.level) errors.level = "Select your level";
    if (!emailRegex.test(formData.email))
      errors.email = "Invalid email format";
    if (!passwordRegex.test(formData.password))
      errors.password = "Min 8 chars, include upper, lower & number";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true); // <-- set button to loading state
    try {
      const { data } = await API.post("/auth/signup", formData);
      toast.success("Signup successful! Check your email for verification.");
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      const msg = err.response?.data?.msg || "Signup failed";
      toast.error(msg);
    } finally {
      setLoading(false); // <-- reset button state
    }
  };

  return (
    <Container fluid className="signup-wrapper">
      <Row className="justify-content-center align-items-center min-vh-100">
        <Col xs={11} sm={9} md={7} lg={6} xl={5}>
          <Card className="signup-card shadow-lg">
            <Card.Body>
              <div className="header-top text-center">
                <img
                  src="/ranks/uniosunlogo.png"
                  alt="UNIOSUN Logo"
                  className="signup-logo"
                />
                <h3 className="mt-2 fw-bold">Create an account</h3>
              </div>

              <Form onSubmit={handleSubmit} className="mt-4 frm">
                {/* Name */}
                <Form.Group className="mb-3">
                  <Form.Control
                    type="text"
                    name="name"
                    placeholder="Name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-control-custom"
                  />
                  {formErrors.name && (
                    <small className="text-danger">{formErrors.name}</small>
                  )}
                </Form.Group>

                {/* Student ID */}
                <Form.Group className="mb-3">
                  <Form.Control
                    type="text"
                    name="studentId"
                    placeholder="Student ID (e.g. 2021/42049)"
                    value={formData.studentId}
                    onChange={handleChange}
                    className="form-control-custom"
                  />
                  {formErrors.studentId && (
                    <small className="text-danger">{formErrors.studentId}</small>
                  )}
                </Form.Group>

                {/* Department */}
                <Form.Group className="mb-3">
                  <Form.Select
                    name="departmentId"
                    value={formData.departmentId}
                    onChange={handleChange}
                    className="form-control-custom"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </Form.Select>
                  {formErrors.departmentId && (
                    <small className="text-danger">{formErrors.departmentId}</small>
                  )}
                </Form.Group>

                {/* Level */}
                <Form.Group className="mb-3">
                  <Form.Select
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                    disabled={!levels.length}
                    className="form-control-custom"
                  >
                    <option value="">Select Level</option>
                    {levels.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl} Level
                      </option>
                    ))}
                  </Form.Select>
                  {formErrors.level && (
                    <small className="text-danger">{formErrors.level}</small>
                  )}
                </Form.Group>

                {/* Email */}
                <Form.Group className="mb-3">
                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="Your E-mail"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-control-custom"
                  />
                  {formErrors.email && (
                    <small className="text-danger">{formErrors.email}</small>
                  )}
                </Form.Group>

                {/* Password */}
                <Form.Group className="mb-2">
                  <InputGroup>
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleChange}
                      className="form-control-custom pass"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </InputGroup>
                  {formErrors.password && (
                    <small className="text-danger">{formErrors.password}</small>
                  )}
                </Form.Group>

                {formData.password && (
                  <div className="password-strength mb-3">
                    <div
                      className={`bar ${passwordStrength.label.toLowerCase()}`}
                    ></div>
                    <small className="text-muted">
                      Strength: {passwordStrength.label}
                    </small>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-100 signup-btn btnz"
                  disabled={loading} // <-- disable while loading
                >
                  {loading ? "Creating Account..." : "Create A New Account"} {/* <-- Interactive Text */}
                </Button>
              </Form>

              <p className="text-center mt-3 small text-muted">
                By creating, you are agreeing to our Terms of Service and Policy
                Service. <br />
                Already have an account?{" "}
                <a href="/login" className="login-link">
                  Log in
                </a>
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Signup;
