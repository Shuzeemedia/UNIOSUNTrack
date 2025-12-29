import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { toast } from "react-toastify";
import * as faceapi from "face-api.js";
import "./enrollFace.css";

const EnrollFace = () => {
    const videoRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Initializing camera...");
    const navigate = useNavigate();

    // ========================
    // Load face-api models
    // ========================
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

        // 🧹 Cleanup camera on unmount
        return () => stopCamera();
    }, []);

    // ========================
    // Camera controls
    // ========================
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoRef.current.srcObject = stream;
            await new Promise(res => (videoRef.current.onloadedmetadata = res));
            setStatusMessage("Camera ready. Position your face.");
        } catch (err) {
            console.error("Camera error:", err);
            toast.error("Camera access denied.");
            setStatusMessage("Camera access failed");
        }
    };

    const stopCamera = () => {
        const stream = videoRef.current?.srcObject;
        if (stream) stream.getTracks().forEach(track => track.stop());
    };

    // ========================
    // Capture & enroll face
    // ========================
    const captureFace = async () => {
        if (loading) return; // 🛑 prevent double click
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

            const token = localStorage.getItem("token");
            if (!token) {
                toast.error("Session expired. Please login again.");
                navigate("/login");
                return;
            }

            setStatusMessage("Uploading face data...");

            const res = await API.post(
                "/auth/enroll-face",
                { faceImage, faceDescriptor },
                { headers: { Authorization: `Bearer ${token}` } }
            );


            if (!res || !res.data) return;

            toast.success(res.data.msg || "Face enrolled successfully!");
            setStatusMessage("Enrollment successful 🎉");
            stopCamera();
            navigate("/dashboard/student");

        } catch (err) {
            const msg = err.response?.data?.msg;

            // 🔥 Handle backend statuses clearly
            if (err.response?.status === 409) {
                toast.error(msg);
                setStatusMessage("Face already registered");
            } else if (err.response?.status === 422) {
                toast.warning(msg);
                setStatusMessage("Lighting unclear, try again");
            } else {
                toast.error(msg || "Face enrollment failed.");
                setStatusMessage("Enrollment failed");
            }

            console.error("Enroll face error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="face-enroll-wrapper">
            <div className="face-enroll-card">
                {/* Header */}
                <div className="face-enroll-header">
                    <img
                        src="/ranks/uniosunlogo.png"
                        alt="Uniosun Logo"
                        className="face-enroll-logo"
                    />
                    <h3>Enroll Your Face</h3>
                </div>

                {/* Video */}
                <div className="face-video-wrapper">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="face-enroll-video"
                    />

                    {/* Status */}
                    <div className="status-message">
                        {statusMessage}
                    </div>
                </div>

                {/* Button */}
                <button
                    className="face-enroll-btn"
                    onClick={captureFace}
                    disabled={loading}
                >
                    {loading ? "Enrolling..." : "Capture Face"}
                </button>
            </div>
        </div>
    );

};

export default EnrollFace;