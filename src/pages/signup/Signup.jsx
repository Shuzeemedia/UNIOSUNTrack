import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/api";
import { toast } from "react-toastify";
import { Container, Row, Col, Form, Button, Card, InputGroup } from "react-bootstrap";
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

  const [departments, setDepartments] = useState([]);
  const [levels, setLevels] = useState([]);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: "" });

  // UI-only state for password visibility (no logic change)
  const [showPassword, setShowPassword] = useState(false);

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

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "departmentId") {
      const selectedDept = departments.find((d) => d._id === value);
      setLevels(selectedDept ? selectedDept.levels : []);
      setFormData((prev) => ({ ...prev, level: "" }));
    }

    if (name === "password") {
      evaluatePasswordStrength(value);
    }
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    const studentIdRegex = /^\d{4}\/\d{5}$/; // e.g. 2021/42049

    if (!emailRegex.test(formData.email)) {
      toast.error("Invalid email format");
      return false;
    }
    if (!passwordRegex.test(formData.password)) {
      toast.error(
        "Password must be at least 8 chars, include uppercase, lowercase, and a number"
      );
      return false;
    }
    if (!studentIdRegex.test(formData.studentId)) {
      toast.error("Student ID must follow format e.g. 2021/42049");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const { data } = await API.post("/auth/signup", formData);
      toast.success(data.msg || "Signup successful");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Signup failed");
    }
  };

  return (
    <Container fluid className="signup-wrapper">
      <Row className="justify-content-center align-items-center min-vh-100">
        <Col xs={11} sm={9} md={7} lg={6} xl={5}>
          <Card className="signup-card shadow-lg">
            <Card.Body>
              <div className="header-top text-center">
                {/* logo is in public/rank folder as you indicated */}
                <img src="/ranks/uniosunlogo.png" alt="UNIOSUN Logo" className="signup-logo" />
                <h3 className="mt-2 fw-bold ">Create an account</h3>
              </div>

              {/* <Button
                variant="light"
                className="google-btn w-100"
                onClick={() => toast.info("Google signup coming soon")}
                type="button"
              >
                <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" />
                <span>Sign up with Google</span>
              </Button>

              <div className="or-divider mb-3">
                <span>OR</span>
              </div> */}

              <Form onSubmit={handleSubmit} className="mt-4">
                <Form.Group className="mb-3">
                  <Form.Control
                    type="text"
                    name="name"
                    placeholder="Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="form-control-custom"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Control
                    type="text"
                    name="studentId"
                    placeholder="Student ID (e.g. 2021/42049)"
                    value={formData.studentId}
                    onChange={handleChange}
                    required
                    className="form-control-custom"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Select
                    name="departmentId"
                    value={formData.departmentId}
                    onChange={handleChange}
                    required
                    className="form-control-custom"
                  >
                    <option value="" className="option">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Select
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                    required
                    disabled={!levels.length}
                    className="form-control-custom"
                  >
                    <option value="" className="option">Select Level</option>
                    {levels.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl} Level
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="Your E-mail"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="form-control-custom"
                  />
                </Form.Group>

                {/* Password input with show/hide toggle - purely UI */}
                <Form.Group className="mb-2">
                  <InputGroup>
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleChange}
                      required
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
                </Form.Group>

                {formData.password && (
                  <div className="password-strength mb-3">
                    <div className={`bar ${passwordStrength.label.toLowerCase()}`}></div>
                    <small className="text-muted">Strength: {passwordStrength.label}</small>
                  </div>
                )}

                <Button type="submit" className="w-100 signup-btn">
                  Create A New Account
                </Button>
              </Form>

              <p className="text-center mt-3 small text-muted">
                By creating, you are agreeing to our Terms of service and Policy service.
                <br />
                You already have an account? <a href="/login" className="login-link">Log in</a>
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Signup;
