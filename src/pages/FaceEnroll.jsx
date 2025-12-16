import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { toast } from "react-toastify";
import * as faceapi from "face-api.js";
import "./faceEnroll.css"; // custom styling file

const FaceEnroll = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadModels();
      await startCamera();
    };
    init();
  }, []);

  const loadModels = async () => {
    const MODEL_URL = "/models";
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  };

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());
  };

  const captureFace = async () => {
    try {
      setLoading(true);

      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      // detect face + descriptor
      const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error("No face detected. Make sure your face is clear.");
        setLoading(false);
        return;
      }

      // convert canvas to blob (image)
      canvas.toBlob(async (blob) => {
        // 1️⃣ Upload image to Cloudinary
        const formData = new FormData();
        formData.append("file", blob);
        formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_PRESET);

        const res = await fetch(import.meta.env.VITE_CLOUDINARY_UPLOAD_URL, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        // 2️⃣ Send faceImage + descriptor to backend
        await API.post("/auth/enroll-face", {
          faceImage: data.secure_url,
          faceDescriptor: Array.from(detection.descriptor),
        });
        

        toast.success("Face enrolled successfully");
        stopCamera();
        navigate("/dashboard/student");
      }, "image/jpeg");
    } catch (err) {
      console.error(err);
      toast.error("Face enrollment failed");
      stopCamera();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="face-enroll-wrapper">
      <div className="face-enroll-card">
        <div className="face-enroll-header">
          <img src="/ranks/uniosunlogo.png" alt="Uniosun Logo" className="face-enroll-logo" />
          <h3>Enroll Your Face</h3>
        </div>

        <div className="face-video-wrapper">
          <video ref={videoRef} autoPlay muted width="320" />
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>

        <button
          className="face-enroll-btn btnz"
          onClick={captureFace}
          disabled={loading}
        >
          {loading ? "Processing..." : "Capture Face"}
        </button>
      </div>
    </div>
  );
};

export default FaceEnroll;