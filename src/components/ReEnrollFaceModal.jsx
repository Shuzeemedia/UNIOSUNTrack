import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import API from "../api/api";
import * as faceapi from "face-api.js";
import "./reEnrollFaceModal.css";

const ReEnrollFaceModal = ({ onClose }) => {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing camera...");

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        await startCamera();
      } catch (err) {
        console.error("Model load error:", err);
        toast.error("Failed to load face detection models.");
        setStatusMessage("Model load failed");
      }
    };

    loadModels();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      await new Promise((res) => (videoRef.current.onloadedmetadata = res));
      setStatusMessage("Camera ready. Position your face.");
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Camera access denied.");
      setStatusMessage("Camera access failed");
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach((track) => track.stop());
  };

  // Capture & re-enroll face
  const captureFace = async () => {
    if (loading) return;
    setLoading(true);
    setStatusMessage("Detecting face...");

    try {
      const video = videoRef.current;

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection || detection.descriptor.length !== 128) {
        toast.error("Face not detected properly. Try again.");
        setStatusMessage("No clear face detected");
        return;
      }

      if (detection.detection.score < 0.7) {
        toast.warning("Face quality too low. Move closer and improve lighting.");
        setStatusMessage("Low face quality");
        return;
      }

      // Capture image
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      const faceImage = canvas.toDataURL("image/jpeg");
      const faceDescriptor = Array.from(detection.descriptor);

      const user = JSON.parse(localStorage.getItem("user"));
      const oldFaceDescriptor = user?.faceDescriptor || [];
      if (!oldFaceDescriptor.length) {
        toast.error("No existing face found to re-enroll.");
        setStatusMessage("Cannot re-enroll without old face");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Session expired. Please login again.");
        return;
      }

      setStatusMessage("Uploading face data...");

      const res = await API.post(
        "/auth/reenroll-face",
        { faceImage, faceDescriptor, oldFaceDescriptor },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(res.data.msg || "Face re-enrolled successfully!");
      setStatusMessage("Re-enrollment successful 🎉");
      stopCamera();
      onClose();

    } catch (err) {
      const msg = err.response?.data?.msg;

      if (err.response?.status === 401) {
        toast.error(msg || "Old face verification failed");
        setStatusMessage("Old face verification failed");
      } else if (err.response?.status === 409) {
        toast.error(msg || "This face is already used by another user");
        setStatusMessage("Face already in use");
      } else {
        toast.error(msg || "Face re-enrollment failed.");
        setStatusMessage("Re-enrollment failed");
      }

      console.error("ReEnroll face error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reEnrollFace-overlay" onClick={onClose}>
      <div className="reEnrollFace-card" onClick={(e) => e.stopPropagation()}>
        <div className="reEnrollFace-header">
          <img src="/ranks/uniosunlogo.png" alt="Uniosun Logo" className="reEnrollFace-logo" />
          <h3>Re-Enroll Your Face</h3>
        </div>

        <div className="reEnrollFace-video-wrapper">
          <video ref={videoRef} autoPlay muted playsInline className="reEnrollFace-video" />
          <div className="status-message">{statusMessage}</div>
        </div>

        <div className="reEnrollFace-buttons">
          <button
            className="face-enroll-btn"
            onClick={captureFace}
            disabled={loading}
          >
            {loading ? "Re-Enrolling..." : "Capture Face"}
          </button>

          <button
            className="face-enroll-btn cancel-btn"
            onClick={() => {
              stopCamera();
              onClose();
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReEnrollFaceModal;
