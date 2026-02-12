import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { Modal, Button } from "react-bootstrap";
import { Html5Qrcode } from "html5-qrcode";
import * as faceapi from "face-api.js";
import { toast } from "react-toastify";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import { useLocation } from "react-router-dom";
import { loginWebAuthn, registerWebAuthn } from "../../utils/webauthn";
import socket from "../../socket";


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
    const [shouldNavigate, setShouldNavigate] = useState(false);

    const [lecturerLocation, setLecturerLocation] = useState(null);
    const geofenceExitTimeoutRef = useRef(null);
    const eyeClosedRef = useRef(false);
    const [graceCountdown, setGraceCountdown] = useState(null);
    const geofenceGraceSeconds = 10; // grace period before stopping scanner
    const geofenceIntervalRef = useRef(null); // for countdown updates



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


    useEffect(() => {
        if (!sessionToken) return;

        // Join the session room
        socket.emit("join-course", sessionToken);

        // Listen for lecturer updates
        socket.on("student-receive-location", (loc) => {
            setLecturerLocation(loc); // update map
        });

        return () => {
            socket.emit("leave-course", sessionToken);
            socket.off("student-receive-location");
        };
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
        if (!faceVerified || !locationReady || !studentLocation) return;

        // Clear old interval
        if (geofenceIntervalRef.current) clearInterval(geofenceIntervalRef.current);
        geofenceIntervalRef.current = null;

        if (insideGeofence) {
            // ✅ Inside geofence → auto-start scanner
            setStatusMessage("GPS locked and inside the attendance zone. You can now scan the QR code");
            setGraceCountdown(null);

            if (geofenceExitTimeoutRef.current) {
                clearTimeout(geofenceExitTimeoutRef.current);
                geofenceExitTimeoutRef.current = null;
            }

            startScanner(); // auto-resume
        } else {
            if (geofenceExitTimeoutRef.current) return;

            // ⚠ Outside geofence → start grace countdown
            let countdown = geofenceGraceSeconds;
            setGraceCountdown(countdown);
            setStatusMessage(`You are outside the attendance zone. Scanner will stop in ${countdown}s if you don't return.`);

            geofenceIntervalRef.current = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    setGraceCountdown(countdown);
                    setStatusMessage(`You are outside the attendance zone. Scanner will stop in ${countdown}s if you don't return.`);
                }
            }, 1000);

            geofenceExitTimeoutRef.current = setTimeout(async () => {
                if (html5QrCodeRef.current) {
                    await html5QrCodeRef.current.stop();
                    html5QrCodeRef.current.clear();
                    html5QrCodeRef.current = null;
                }
                setStatusMessage("You left the attendance zone. Move closer to scan the QR code.");
                setGraceCountdown(null);

                if (geofenceIntervalRef.current) {
                    clearInterval(geofenceIntervalRef.current);
                    geofenceIntervalRef.current = null;
                }
            }, geofenceGraceSeconds * 1000);
        }

        return () => {
            if (geofenceIntervalRef.current) clearInterval(geofenceIntervalRef.current);
            if (geofenceExitTimeoutRef.current) clearTimeout(geofenceExitTimeoutRef.current);
        };
    }, [insideGeofence, faceVerified, locationReady]);


    // Optional: show countdown in UI
    useEffect(() => {
        if (graceCountdown !== null) {
            setStatusMessage(`You are outside the attendance zone. Scanner will stop in ${graceCountdown}s if you don't return.`);
        }
    }, [graceCountdown]);


    const fullCleanup = async () => {
        stopVideoStream();

        // Stop QR scanner safely
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop();
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.warn("Error stopping QR scanner:", err);
            }
            html5QrCodeRef.current = null;
        }

        // Cancel all timers and intervals
        if (geofenceExitTimeoutRef.current) {
            clearTimeout(geofenceExitTimeoutRef.current);
            geofenceExitTimeoutRef.current = null;
        }
        if (geofenceIntervalRef.current) {
            clearInterval(geofenceIntervalRef.current);
            geofenceIntervalRef.current = null;
        }

        scanningLockedRef.current = true; // lock scanning until re-enabled
    };




    /** ==================== INIT CAMERA ==================== */
    useEffect(() => {
        const initCamera = async () => {
            try {
                await loadFaceModels();
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
                await new Promise(res => (videoRef.current.onloadedmetadata = res));
                await videoRef.current.play();

            } catch (err) {
                console.error("Camera init error:", err);
                toast.error("Failed to start camera");
            }
        };

        initCamera();

        return () => {
            fullCleanup();
        };
    }, []);


    useEffect(() => {
        if (!shouldNavigate) return;

        fullCleanup().finally(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    navigate("/dashboard/student", { replace: true });
                });
            });
        });
    }, [shouldNavigate, navigate]);

    useEffect(() => {
        scanningLockedRef.current = false;
    }, []);




    const stopVideoStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
    };

    /** ==================== FACE VERIFICATION (Random Head-turn Liveness) ==================== */
    const verifyFace = async () => {
        if (faceLoading) return;
        if (!sessionInfo || !videoRef.current) return;

        setFaceLoading(true);
        setStatusMessage("Detecting face...");

        try {
            const video = videoRef.current;
            const storedDescriptor = new Float32Array(sessionInfo.studentFaceDescriptor);

            const faceMatcher = new faceapi.FaceMatcher(
                [new faceapi.LabeledFaceDescriptors("student", [storedDescriptor])],
                0.45
            );

            let recognized = false;
            let baseNoseX = null;
            let baseNoseY = null;
            let headMoveFrames = 0;
            const startTime = Date.now();
            const TIMEOUT = 20000; // 20s max

            // Randomly pick a direction for this verification
            const directions = ["left", "right", "down"];
            const targetDirection = directions[Math.floor(Math.random() * directions.length)];

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
                    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (!detection) {
                    setStatusMessage("No face detected...");
                    return requestAnimationFrame(detectLoop);
                }

                const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

                if (bestMatch.label === "student") {
                    const nose = detection.landmarks.getNose();

                    // ✅ Flip X coordinate for mirrored video
                    const noseX = video.videoWidth - nose[3].x; // tip of nose
                    const noseY = nose[3].y;

                    if (baseNoseX === null) baseNoseX = noseX;
                    if (baseNoseY === null) baseNoseY = noseY;

                    const thresholdX = video.videoWidth / 20; // ~5% of width
                    const thresholdY = video.videoHeight / 25; // ~4% of height

                    // Check if the correct direction is moved
                    let movedCorrectDirection = false;

                    switch (targetDirection) {
                        case "left":
                            movedCorrectDirection = noseX < baseNoseX - thresholdX;
                            break;
                        case "right":
                            movedCorrectDirection = noseX > baseNoseX + thresholdX;
                            break;
                        case "down":
                            movedCorrectDirection = noseY > baseNoseY + thresholdY;
                            break;
                        default:
                            movedCorrectDirection = false;
                    }


                    if (movedCorrectDirection) {
                        headMoveFrames++;
                    } else {
                        headMoveFrames = 0; // reset if movement stops or moves wrong way
                    }

                    // Require 3 consecutive frames in the correct direction
                    if (headMoveFrames >= 3) {
                        recognized = true;
                        setStatusMessage("Head movement detected. Face verified!");
                        toast.success("Face verified successfully");

                        await api.post("/auth/verify-face", {
                            faceDescriptor: Array.from(detection.descriptor),
                        });

                        setFaceVerified(true);
                        stopVideoStream();
                        return;
                    } else {
                        setStatusMessage(
                            targetDirection === "down"
                                ? "Please nod your head slightly down..."
                                : `Please turn your head slightly ${targetDirection}...`
                        );
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
        if (!insideGeofence || scanningLockedRef.current) return; // only start if inside zone

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
                        setModalMsg(res.msg || "Attendance recorded");
                        setModalShow(true);

                        // Stop scanner immediately after marking
                        await qr.stop();
                        qr.clear();
                        html5QrCodeRef.current = null;
                    } catch (err) {
                        toast.error(
                            err?.response?.data?.msg ||
                            err?.message ||
                            "Failed to mark attendance"
                        );
                        scanningLockedRef.current = false; // unlock for retry
                    }
                }
            );
        } catch (err) {
            console.error("QR Scanner init failed:", err);
            toast.error("QR Scanner failed");
            html5QrCodeRef.current = null;
            scanningLockedRef.current = false;
        }
    };


    /** ==================== MARK ATTENDANCE ==================== */
    const markAttendance = async (scannedToken) => {

        if (!insideGeofence) {
            toast.warn("You may be outside the zone. Trying server verification…");
        }


        if (!sessionInfo) throw new Error("Session info missing");

        if (!studentLocation || !locationReady) {
            toast.error("Waiting for your real GPS location. Please stay still…");
            throw new Error("GPS not ready");
        }

        if (studentLocation.accuracy > 300) {
            toast.error("GPS accuracy too low. Please stay still.");
            throw new Error("Poor GPS accuracy");
        }

        // use studentLocation from map

        const token = localStorage.getItem("token");
        const res = await api.post(
            `/sessions/scan/${scannedToken}`,
            {
                location: {
                    lat: studentLocation.lat,
                    lng: studentLocation.lng,
                    accuracy: Math.min(studentLocation.accuracy, 200)

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

                        {/* Show outside-zone warning if not inside */}
                        {!insideGeofence && (
                            <p style={{ color: "orange", fontWeight: 600, marginTop: 10 }}>
                                You are outside the attendance zone. Move closer to start scanning.
                                {graceCountdown !== null && ` Stopping in ${graceCountdown}s if you don't return.`}
                            </p>
                        )}

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

                                if (!modalMsg?.toLowerCase().includes("already")) {
                                    setShouldNavigate(true);
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