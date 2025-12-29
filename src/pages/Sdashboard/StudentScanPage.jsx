import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import api from "../../api/api";
import { Modal, Button } from "react-bootstrap";
import { Html5Qrcode } from "html5-qrcode";
import * as faceapi from "face-api.js";
import { toast } from "react-toastify";
import "./StudentScanPage.css";

function getDistanceInMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const loadFaceModels = async () => {
    const MODEL_URL = "/models";
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
};

const StudentScanPage = () => {
    const { sessionToken } = useParams();
    const videoRef = useRef(null);
    const html5QrCodeRef = useRef(null);
    const streamRef = useRef(null);
    const scanningLockedRef = useRef(false);
    const navigate = useNavigate();
    const [statusMessage, setStatusMessage] = useState("Position your face properly");

    const distance = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

    const checkBlink = (eye) => {
        return (
            distance(eye[1], eye[5]) +
            distance(eye[2], eye[4])
        ) / (2 * distance(eye[0], eye[3]));
    };



    const [sessionInfo, setSessionInfo] = useState(null);
    const [faceVerified, setFaceVerified] = useState(false);
    const [faceLoading, setFaceLoading] = useState(false);
    const [modalShow, setModalShow] = useState(false);
    const [modalMsg, setModalMsg] = useState("");

    // Fetch session info & student face descriptor
    useEffect(() => {
        if (!sessionToken) return toast.error("Invalid session URL");

        const fetchSession = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await api.get(`/sessions/${sessionToken}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const session = res.data.session;

                if (!session || session.status === "expired") {
                    toast.warn("Session expired or invalid");
                    return;
                }

                const faceRes = await api.get(`/sessions/${sessionToken}/student`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const studentFaceDescriptor = faceRes.data.studentFaceDescriptor;

                if (!studentFaceDescriptor || studentFaceDescriptor.length !== 128) {
                    toast.error("Face descriptor missing or invalid");
                    console.warn("Face descriptor invalid:", studentFaceDescriptor);
                    return;
                }

                setSessionInfo({ ...session, studentFaceDescriptor });
            } catch (err) {
                toast.error("Failed to fetch session info");
                console.error(err);
            }
        };

        fetchSession();
    }, [sessionToken]);

    // Start camera
    useEffect(() => {
        const initCamera = async () => {
            try {
                await loadFaceModels();
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (err) {
                console.error("Camera init error:", err);
                toast.error("Failed to start camera");
            }
        };
        initCamera();

        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
            if (html5QrCodeRef.current) {
                html5QrCodeRef.current.stop().catch(() => { });
                html5QrCodeRef.current.clear().catch(() => { });
            }
        };
    }, []);

    const stopVideoStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };


    // Face verification

    const verifyFace = async () => {
        if (!sessionInfo || !videoRef.current) return;

        setFaceLoading(true);
        setStatusMessage("Initializing camera...");

        try {
            const video = videoRef.current;

            const storedArray = sessionInfo.studentFaceDescriptor;
            if (!storedArray || storedArray.length !== 128) {
                toast.error("Stored face data invalid");
                setFaceLoading(false);
                return;
            }

            const storedDescriptor = new Float32Array(storedArray);

            const faceMatcher = new faceapi.FaceMatcher(
                [new faceapi.LabeledFaceDescriptors("student", [storedDescriptor])],
                0.6 // SAME AS LOGIN UX FILTER
            );

            let blinkCount = 0;
            let recognized = false;
            const startTime = Date.now();
            const TIMEOUT = 20000;

            setStatusMessage("Detecting face...");

            const detectLoop = async () => {
                if (!videoRef.current) return;

                if (recognized || Date.now() - startTime > TIMEOUT) {
                    if (!recognized) {
                        setStatusMessage("Face not recognized or liveness failed");
                        toast.error("Face verification failed");
                    }

                    setFaceLoading(false);
                    return;
                }

                const detection = await faceapi
                    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (!detection) {
                    setStatusMessage("No face detected...");
                    return requestAnimationFrame(detectLoop);
                }

                const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

                if (bestMatch.label === "student") {
                    const leftEye = detection.landmarks.getLeftEye();
                    const ear = checkBlink(leftEye);

                    if (ear < 0.25) blinkCount += 1;

                    if (blinkCount >= 1) {
                        recognized = true;
                        setStatusMessage("Verifying face on server...");

                        try {
                            toast.success("Face verified successfully");
                            setFaceVerified(true);
                            stopVideoStream();

                            setTimeout(startScanner, 300);
                            return;

                        } catch (err) {
                            toast.error("Face verification failed");
                            setStatusMessage("Face does not match this account");
                            recognized = false;
                            blinkCount = 0;
                        }
                    } else {
                        setStatusMessage("Face detected, please blink...");
                    }
                } else {
                    setStatusMessage("Face does not match. Try again...");
                }

                requestAnimationFrame(detectLoop);
            };

            detectLoop();
        } catch (err) {
            console.error(err);
            toast.error("Face verification failed");
            setFaceLoading(false);
        }
    };



    // QR scanner using existing video feed
    const startScanner = async () => {
        const readerEl = document.getElementById("reader");
        if (!readerEl) return;

        if (html5QrCodeRef.current) return;

        try {
            const qr = new Html5Qrcode("reader");
            html5QrCodeRef.current = qr;

            await qr.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: 250 },
                async (decodedText) => {
                    if (scanningLockedRef.current) return;
                    scanningLockedRef.current = true;

                    // ✅ Extract token
                    const scannedToken = decodedText.split("/").pop();

                    const success = await markAttendance(scannedToken);

                    if (success) {
                        // ✅ STOP ONLY ON SUCCESS
                        await qr.stop();
                        qr.clear();
                        html5QrCodeRef.current = null;
                    } else {
                        // ❌ Resume scanning on failure
                        scanningLockedRef.current = false;
                    }
                }
            );
        } catch (err) {
            console.error("QR Scanner init failed:", err);
            toast.error("QR Scanner failed");
        }
    };




    // Mark attendance
    const markAttendance = async (scannedToken) => {
        try {
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve(pos.coords),
                (err) => {
                    if (err.code === 1) toast.error("Location permission denied");
                    else if (err.code === 2) toast.error("Location unavailable");
                    else toast.error("GPS timeout");
                    reject(err.message);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0,
                }
            );

            const courseLoc = sessionInfo.course.location;
            if (courseLoc?.lat && courseLoc?.lng) {
                const dist = getDistanceInMeters(
                    position.latitude,
                    position.longitude,
                    courseLoc.lat,
                    courseLoc.lng
                );
                if (dist > courseLoc.radius) {
                    toast.error("You are not within lecture location");
                    return false;
                }
            }

            const token = localStorage.getItem("token");

            const res = await api.post(
                `/sessions/scan/${scannedToken}`,
                { location: position },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setModalMsg(res.data.msg);
            setModalShow(true);
            return true; // SUCCESS
        } catch (err) {
            toast.error(err?.response?.data?.msg || "Attendance failed");
            return false; // FAILURE
        }
    };



    return (
        <div className="student-scan-wrapper">
            <div className="student-scan-card">
                <h3>Scan Attendance QR</h3>

                {!faceVerified && (
                    <div className="face-check-wrapper">
                        <h4 className="face-title">Face Verification</h4>

                        <div className="login-video-wrapper">
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="login-face-video"
                            />

                            <div className="login-status-overlay">
                                {statusMessage || "Position your face properly"}
                            </div>
                        </div>

                        <button
                            className="login-btn btnz mt-2"
                            onClick={verifyFace}
                            disabled={faceLoading}
                        >
                            {faceLoading ? "Verifying..." : "Verify Face"}
                        </button>
                    </div>
                )}

                {faceVerified && (
                    <div className="qr-scan-wrapper">
                        <div id="reader" className="qr-reader" />
                    </div>
                )}


                <Modal
                    show={modalShow}
                    centered
                    backdrop="static"
                    keyboard={false}
                    dialogClassName="success-modal"
                >
                    <Modal.Body className="success-body">
                        <div className="success-icon">✓</div>

                        <h4 className="success-title">Attendance Marked</h4>

                        <p className="success-text">{modalMsg}</p>

                        <Button
                            className="success-btn"
                            onClick={() => navigate("/dashboard/student", { replace: true })}
                        >

                            Go to Dashboard
                        </Button>
                    </Modal.Body>
                </Modal>

            </div>
        </div>
    );
};

export default StudentScanPage;