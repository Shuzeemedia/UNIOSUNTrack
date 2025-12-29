// Login.jsx
import { useState, useContext, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../../api/api";
import { AuthContext } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import * as faceapi from "face-api.js";
import "./login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [faceCheck, setFaceCheck] = useState(false);
  const [userData, setUserData] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  const videoRef = useRef(null);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    };
    loadModels();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({ email: "", password: "" });
    setLoading(true);

    try {
      const { data } = await API.post("/auth/login", { email, password });
      const { user, token } = data;

      localStorage.clear();
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);
      setUserData({ user, token });
      login(user, token);

      // =======================
      // STUDENT FLOW
      // =======================
      if (user.role === "student") {
        // If no face enrolled OR face descriptor invalid → redirect to EnrollFace
        if (!user.faceImage || !user.faceDescriptor || user.faceDescriptor.length !== 128) {
          toast.info("Please enroll or re-enroll your face.");
          navigate("/enroll-face");
        } else {
          // Start face recognition for login
          setFaceCheck(true);
        }
        return;
      }

      // TEACHER / ADMIN FLOW
      if (user.role === "teacher") navigate("/dashboard/teacher");
      else if (user.role === "admin") navigate("/admin/dashboard");
      else navigate("/");

    } catch (err) {
      const resData = err.response?.data;
      if (resData?.msg) toast.error(resData.msg);
      else if (resData?.field && resData?.msg) setErrors(prev => ({ ...prev, [resData.field]: resData.msg }));
      else toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // =======================
  // Face Recognition + Liveness
  // =======================
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
    await new Promise(res => (videoRef.current.onloadedmetadata = res));
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());
  };

  const distance = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
  const checkBlink = (leftEye) =>
    (distance(leftEye[1], leftEye[5]) + distance(leftEye[2], leftEye[4])) /
    (2 * distance(leftEye[0], leftEye[3]));

  useEffect(() => {
    if (faceCheck) handleFaceRecognition();
  }, [faceCheck]);

  const handleFaceRecognition = async () => {
    if (!userData) return;
    setLoading(true);
    setStatusMessage("Initializing camera...");

    try {
      await startCamera();
      const video = videoRef.current;

      const storedArray = userData.user.faceDescriptor;

      // Force re-enrollment if descriptor invalid
      if (!storedArray || storedArray.length !== 128) {
        toast.info("Stored face invalid. Redirecting to re-enroll.");
        stopCamera();
        setFaceCheck(false);
        navigate("/enroll-face");
        return;
      }

      const storedDescriptor = new Float32Array(storedArray);
      const faceMatcher = new faceapi.FaceMatcher(
        [new faceapi.LabeledFaceDescriptors(userData.user.id, [storedDescriptor])],
        0.45
      );


      let blinkCount = 0;
      let recognized = false;
      const startTime = Date.now();
      const TIMEOUT = 20000;

      setStatusMessage("Detecting face...");

      const detectLoop = async () => {
        if (recognized || Date.now() - startTime > TIMEOUT) {
          if (!recognized) setStatusMessage("Face not recognized or liveness check failed");
          stopCamera();
          return;
        }

        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection && detection.descriptor.length === storedDescriptor.length) {
          const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
          if (bestMatch.label === userData.user.id) {
            const leftEye = detection.landmarks.getLeftEye();
            const ear = checkBlink(leftEye);
            if (ear < 0.25) blinkCount += 1;

            if (blinkCount >= 1) {
              recognized = true;
              setStatusMessage("Verifying face on server...");

              try {
                // FINAL SERVER VERIFICATION
                await API.post("/auth/verify-face", {
                  faceDescriptor: Array.from(detection.descriptor),
                });

                toast.success("Face verified! Logging in...");
                stopCamera();
                navigate("/dashboard/student");
                return;

              } catch (err) {
                toast.error("Face verification failed");
                setStatusMessage("Face does not match this account");
                recognized = false;
                blinkCount = 0;
              }
            }
            else {
              setStatusMessage("Face detected, please blink...");
            }
          } else {
            setStatusMessage("Face does not match. Try again...");
          }
        } else {
          setStatusMessage("No face detected...");
        }

        requestAnimationFrame(detectLoop);
      };

      detectLoop();
    } catch (err) {
      console.error(err);
      toast.error("Face recognition failed");
      stopCamera();
      setStatusMessage("Face recognition failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <img src="/ranks/uniosunlogo.png" alt="Uniosun Logo" className="login-logo" />
          <h3>Welcome Back</h3>
        </div>

        {!faceCheck && (
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
                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.password && <div className="input-error">{errors.password}</div>}
            </div>

            <button type="submit" className="login-btn btnz" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        )}

        {faceCheck && (
          <div className="face-check-wrapper">
            <h4 className="face-title">Face Verification</h4>
            <div className="login-video-wrapper">
              <video ref={videoRef} autoPlay muted playsInline className="login-face-video" />
              <div className="login-status-overlay">{statusMessage || "Position your face properly"}</div>
            </div>

            <button className="login-btn btnz mt-2" onClick={handleFaceRecognition} disabled={loading}>
              {loading ? "Verifying..." : "Verify Face"}
            </button>
          </div>
        )}

        <div className="login-links text-muted">
          <p>
            <Link to="/forgot-password" className="login-link">
              Forgot your password?
            </Link>
          </p>
          <p>
            Don’t have an account? <Link to="/signup" className="login-link">Sign up here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;