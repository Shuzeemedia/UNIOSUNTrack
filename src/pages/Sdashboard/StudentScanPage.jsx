import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { Modal, Button } from "react-bootstrap";
import { Html5Qrcode } from "html5-qrcode";
import * as faceapi from "face-api.js";
import { toast } from "react-toastify";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import { useLocation } from "react-router-dom";

import "./StudentScanPage.css";
import AttendanceMap from "../../components/AttendanceMap";

// Helper: distance between GPS points in meters
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

// Load face-api models
const loadFaceModels = async () => {
    const MODEL_URL = "/models";
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
};

// Compute eye aspect ratio (blink detection)
const distance = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
const checkBlink = (eye) => (distance(eye[1], eye[5]) + distance(eye[2], eye[4])) / (2 * distance(eye[0], eye[3]));

const StudentScanPage = () => {
    const { sessionToken } = useParams();
    const videoRef = useRef(null);
    const html5QrCodeRef = useRef(null);
    const streamRef = useRef(null);
    const scanningLockedRef = useRef(false);
    const navigate = useNavigate();

    const [statusMessage, setStatusMessage] = useState("Position your face properly");
    const [sessionInfo, setSessionInfo] = useState(null);
    const [faceVerified, setFaceVerified] = useState(false);
    const [faceLoading, setFaceLoading] = useState(false);
    const location = useLocation();
    const [insideGeofence, setInsideGeofence] = useState(false);
    const [studentLocation, setStudentLocation] = useState(null);
    const [locationReady, setLocationReady] = useState(false);

    const [lecturerLocation, setLecturerLocation] = useState(null);




    const [modalShow, setModalShow] = useState(false);
    const [modalMsg, setModalMsg] = useState("");

    /** ==================== FETCH SESSION & FACE ==================== */
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


    // Set lecturer location once sessionInfo is available
    useEffect(() => {
        if (sessionInfo?.location) {
            setLecturerLocation({
                lat: sessionInfo.location.lat,
                lng: sessionInfo.location.lng,
            });
        }
    }, [sessionInfo]);



    useEffect(() => {
        if (location.state?.alreadyMarked) {
            setModalMsg("Attendance already marked for this session");
            setModalShow(true);
        }
    }, [location.state]);

    useEffect(() => {
        if (faceVerified && locationReady && studentLocation && insideGeofence && !html5QrCodeRef.current) {
            setStatusMessage("GPS locked and inside the attendance zone. You can now scan the QR code");
            startScanner();
        } else if (!insideGeofence) {
            setStatusMessage("Move closer to the lecture to scan the QR code");
        }
    }, [faceVerified, locationReady, studentLocation, insideGeofence]);




    /** ==================== INIT CAMERA ==================== */
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
            stopVideoStream();
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
        if (videoRef.current) videoRef.current.srcObject = null;
    };

    /** ==================== FACE VERIFICATION ==================== */
    const verifyFace = async () => {
        if (!sessionInfo || !videoRef.current) return;

        setFaceLoading(true);
        setStatusMessage("Detecting face...");

        try {
            const video = videoRef.current;
            const storedDescriptor = new Float32Array(sessionInfo.studentFaceDescriptor);

            const faceMatcher = new faceapi.FaceMatcher(
                [new faceapi.LabeledFaceDescriptors("student", [storedDescriptor])],
                0.6
            );

            let blinkCount = 0;
            let recognized = false;
            const startTime = Date.now();
            const TIMEOUT = 20000;

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
                        setStatusMessage("Face verified, starting scanner...");
                        toast.success("Face verified successfully");
                        setFaceVerified(true);
                        stopVideoStream();
                        return;
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

    /** ==================== QR SCANNER ==================== */

    const startScanner = async () => {
        const readerEl = document.getElementById("reader");
        if (!readerEl) return;

        if (html5QrCodeRef.current) return; // already running

        try {
            const qr = new Html5Qrcode("reader");
            html5QrCodeRef.current = qr;

            await qr.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: 250 },
                async (decodedText) => {
                    if (scanningLockedRef.current) return;
                    scanningLockedRef.current = true; // lock

                    const scannedToken = decodedText.split("/").pop();

                    try {
                        const res = await markAttendance(scannedToken);
                        console.log("QR decoded token:", decodedText);
                        console.log("Attendance result:", res);

                        // Show modal for both new and already marked
                        setModalMsg(res.msg || "Attendance recorded");
                        setModalShow(true);

                        // Stop scanner immediately
                        await qr.stop();
                        qr.clear();
                        html5QrCodeRef.current = null;

                    } catch (err) {
                        const msg =
                            err?.response?.data?.msg ||
                            err?.message ||
                            "Failed to mark attendance";

                        toast.error(msg);

                        // 🔓 UNLOCK scanner so student can retry
                        scanningLockedRef.current = false;
                    }

                }
            );
        } catch (err) {
            console.error("QR Scanner init failed:", err);
            toast.error("QR Scanner failed");
        }
    };

    /** ==================== MARK ATTENDANCE ==================== */
    const markAttendance = async (scannedToken) => {

        if (!insideGeofence) {
            toast.error("You are outside the attendance zone ❌. Move closer to the lecture.");
            throw new Error("Outside attendance zone");
        }

        if (!sessionInfo) throw new Error("Session info missing");
        if (!studentLocation || !locationReady) {
            toast.error("Waiting for your real GPS location. Please stay still…");
            throw new Error("GPS not ready");
        }
        // use studentLocation from map

        const token = localStorage.getItem("token");
        const res = await api.post(
            `/sessions/scan/${scannedToken}`,
            {
                location: {
                    lat: studentLocation.lat,
                    lng: studentLocation.lng,
                    accuracy: studentLocation.accuracy
                }
            },

            { headers: { Authorization: `Bearer ${token}` } }
        );

        return res.data;
    };

    /** ==================== RENDER ==================== */
    return (
        <div className="student-scan-wrapper">
            <div className="student-scan-card">
                <h3>Scan Attendance QR</h3>

                {!faceVerified && (
                    <div className="face-check-wrapper">
                        <h4 className="face-title">Face Verification</h4>
                        <div className="login-video-wrapper">
                            <video ref={videoRef} autoPlay muted playsInline className="login-face-video" />
                            <div className="login-status-overlay">{statusMessage}</div>
                        </div>
                        <button className="login-btn btnz mt-2" onClick={verifyFace} disabled={faceLoading}>
                            {faceLoading ? "Verifying..." : "Verify Face"}
                        </button>
                    </div>
                )}

                {faceVerified && sessionInfo?.location && (

                    <>
                        <AttendanceMap
                            sessionLocation={sessionInfo.location}
                            onInsideChange={setInsideGeofence}
                            onLocationChange={setStudentLocation}
                            onGpsReady={setLocationReady}
                            lecturerLocation={lecturerLocation}
                        />


                        <div id="reader" className="qr-reader" />
                    </>
                )}


                {/* SUCCESS MODAL */}
                <Modal
                    show={modalShow}
                    centered
                    backdrop="static"
                    keyboard={false}
                    dialogClassName="success-modal"
                >
                    <Modal.Body className="success-body">
                        <div className="success-icon">✓</div>

                        <h4 className="success-title">
                            {modalMsg?.toLowerCase().includes("already")
                                ? "Attendance Already Marked"
                                : "Attendance Marked"}
                        </h4>

                        <p className="success-text">{modalMsg}</p>

                        <Button
                            className="success-btn"
                            onClick={() => {
                                setModalShow(false);
                                scanningLockedRef.current = true; // unlock always

                                // Navigate only for new attendance
                                if (!modalMsg?.toLowerCase().includes("already")) {
                                    navigate("/dashboard/student", { replace: true });
                                }
                            }}
                        >
                            {modalMsg?.toLowerCase().includes("already") ? "Close" : "Go to Dashboard"}
                        </Button>
                    </Modal.Body>
                </Modal>
            </div>
        </div>
    );
};

export default StudentScanPage;