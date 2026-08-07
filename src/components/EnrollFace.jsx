import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { toast } from "react-toastify";
import * as faceapi from "face-api.js";
import {
    RiShieldCheckLine,
    RiCameraLine,
    RiInformationLine,
    RiCheckLine,
    RiLoader4Line,
    RiArrowRightLine,
    RiCloseLine,
} from "react-icons/ri";
import "./enrollFace.css";

const EnrollFace = () => {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const mountedRef = useRef(false);

    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [enrollmentComplete, setEnrollmentComplete] = useState(false);

    const [statusMessage, setStatusMessage] = useState(
        "Preparing your camera..."
    );

    // =========================================================
    // LOAD FACE MODELS
    // =========================================================

    const loadModels = async () => {
        const MODEL_URL = "/models";

        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
    };

    // =========================================================
    // CAMERA
    // =========================================================

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current
                .getTracks()
                .forEach((track) => track.stop());

            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setCameraReady(false);
    };

    const startCamera = async () => {
        try {
            setStatusMessage("Requesting camera access...");

            const stream =
                await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "user",
                        width: {
                            ideal: 640,
                        },
                        height: {
                            ideal: 480,
                        },
                    },
                    audio: false,
                });

            if (!mountedRef.current) {
                stream
                    .getTracks()
                    .forEach((track) => track.stop());

                return;
            }

            streamRef.current = stream;

            if (!videoRef.current) return;

            videoRef.current.srcObject = stream;

            await new Promise((resolve) => {
                videoRef.current.onloadedmetadata = resolve;
            });

            await videoRef.current.play();

            setCameraReady(true);
            setLoading(false);

            setStatusMessage(
                "Camera ready. Position your face inside the frame."
            );
        } catch (err) {
            console.error("Camera error:", err);

            setLoading(false);
            setCameraReady(false);

            setStatusMessage(
                "Camera access could not be started."
            );

            toast.error(
                "Unable to access your camera. Please allow camera permission."
            );
        }
    };

    // =========================================================
    // INITIALIZATION
    // =========================================================

    useEffect(() => {
        mountedRef.current = true;

        const initialize = async () => {
            try {
                setLoading(true);
                setStatusMessage(
                    "Loading secure face recognition..."
                );

                await loadModels();

                if (!mountedRef.current) return;

                await startCamera();
            } catch (err) {
                console.error(
                    "Face enrollment initialization error:",
                    err
                );

                setLoading(false);

                setStatusMessage(
                    "Unable to initialize face enrollment."
                );

                toast.error(
                    "Failed to initialize face enrollment."
                );
            }
        };

        initialize();

        return () => {
            mountedRef.current = false;
            stopCamera();
        };
    }, []);

    // =========================================================
    // CAPTURE & ENROLL
    // =========================================================

    const captureFace = async () => {
        if (enrolling || !cameraReady) return;

        const video = videoRef.current;

        if (!video) {
            toast.error("Camera is not ready.");
            return;
        }

        setEnrolling(true);
        setFaceDetected(false);
        setStatusMessage("Scanning your face...");

        try {
            const detection = await faceapi
                .detectSingleFace(
                    video,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: 224,
                        scoreThreshold: 0.5,
                    })
                )
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                toast.error(
                    "No face detected. Position your face clearly inside the frame."
                );

                setStatusMessage(
                    "No face detected. Try again."
                );

                setEnrolling(false);
                return;
            }

            setFaceDetected(true);

            // =====================================================
            // FACE QUALITY CHECK
            // =====================================================

            if (detection.descriptor.length !== 128) {
                toast.error(
                    "Unable to create a valid face profile."
                );

                setStatusMessage(
                    "Face data could not be processed."
                );

                setEnrolling(false);
                return;
            }

            if (detection.detection.score < 0.7) {
                toast.warning(
                    "Face quality is too low. Improve your lighting and move closer."
                );

                setStatusMessage(
                    "Face quality is too low. Improve lighting and try again."
                );

                setEnrolling(false);
                return;
            }

            // =====================================================
            // CAPTURE IMAGE
            // =====================================================

            setStatusMessage(
                "Creating your secure face profile..."
            );

            const canvas = document.createElement("canvas");

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext("2d");

            context.drawImage(
                video,
                0,
                0,
                canvas.width,
                canvas.height
            );

            const faceImage =
                canvas.toDataURL("image/jpeg", 0.85);

            const faceDescriptor =
                Array.from(detection.descriptor);

            // =====================================================
            // CHECK SESSION
            // =====================================================

            const token =
                localStorage.getItem("token");

            if (!token) {
                toast.error(
                    "Your session has expired. Please login again."
                );

                stopCamera();
                navigate("/login");
                return;
            }

            // =====================================================
            // SEND TO SERVER
            // =====================================================

            setStatusMessage(
                "Securing your face profile..."
            );

            const res = await API.post(
                "/auth/enroll-face",
                {
                    faceImage,
                    faceDescriptor,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!res?.data) {
                throw new Error(
                    "Invalid enrollment response."
                );
            }

            // =====================================================
            // SUCCESS
            // =====================================================

            setEnrollmentComplete(true);
            setStatusMessage(
                "Your face has been enrolled successfully."
            );

            toast.success(
                res.data.msg ||
                    "Face enrolled successfully!"
            );

            stopCamera();

            setTimeout(() => {
                if (mountedRef.current) {
                    navigate("/dashboard/student");
                }
            }, 900);

        } catch (err) {
            console.error(
                "Enroll face error:",
                err
            );

            const msg =
                err.response?.data?.msg;

            if (err.response?.status === 409) {
                toast.error(
                    msg || "Face is already registered."
                );

                setStatusMessage(
                    "This face is already registered."
                );
            } else if (err.response?.status === 422) {
                toast.warning(
                    msg ||
                        "Face quality is not clear enough. Try again."
                );

                setStatusMessage(
                    "Face quality is unclear. Improve lighting and try again."
                );
            } else {
                toast.error(
                    msg ||
                        "Face enrollment failed. Please try again."
                );

                setStatusMessage(
                    "Enrollment failed. Please try again."
                );
            }

            setFaceDetected(false);
        } finally {
            if (mountedRef.current) {
                setEnrolling(false);
            }
        }
    };

    // =========================================================
    // LOGOUT / CANCEL
    // =========================================================

    const handleCancel = () => {
        stopCamera();
        navigate("/login");
    };

    // =========================================================
    // RENDER
    // =========================================================

    return (
        <div className="face-enroll-page">

            <div className="face-enroll-container">

                {/* =================================================
                    TOP BRAND
                ================================================= */}

                <div className="face-enroll-brand">

                    <img
                        src="/ranks/uniosunlogo.png"
                        alt="UNIOSUN Logo"
                    />

                    <div>
                        <strong>
                            UNIOSUNTrack
                        </strong>

                        <span>
                            Smart Attendance Management System
                        </span>
                    </div>

                </div>


                {/* =================================================
                    MAIN CARD
                ================================================= */}

                <div className="face-enroll-card">

                    {/* =================================================
                        HEADER
                    ================================================= */}

                    <div className="face-enroll-header">

                        <div className="face-enroll-security-icon">
                            <RiShieldCheckLine />
                        </div>

                        <div className="face-enroll-heading">

                            <div className="face-enroll-step">
                                STEP 1 OF 1
                            </div>

                            <h1>
                                Enroll Your Face
                            </h1>

                            <p>
                                Set up your biometric identity
                                to securely mark attendance.
                            </p>

                        </div>

                    </div>


                    {/* =================================================
                        INSTRUCTION
                    ================================================= */}

                    <div className="face-enroll-instruction">

                        <div className="instruction-icon">
                            <RiInformationLine />
                        </div>

                        <div>
                            <strong>
                                Before you continue
                            </strong>

                            <ul>
                                <li>
                                    Make sure your face is clearly visible.
                                </li>

                                <li>
                                    Stay in a well-lit environment.
                                </li>

                                <li>
                                    Remove anything covering your face.
                                </li>
                            </ul>
                        </div>

                    </div>


                    {/* =================================================
                        CAMERA
                    ================================================= */}

                    <div className="face-enroll-camera">

                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="face-enroll-video"
                        />

                        {/* Dark overlay */}

                        <div className="camera-overlay" />


                        {/* Face guide */}

                        <div className="face-guide">

                            <div className="face-corner top-left" />
                            <div className="face-corner top-right" />
                            <div className="face-corner bottom-left" />
                            <div className="face-corner bottom-right" />

                            <div className="face-outline" />

                        </div>


                        {/* Camera loading */}

                        {!cameraReady && (

                            <div className="camera-loading">

                                <RiLoader4Line className="spin" />

                                <span>
                                    Starting camera...
                                </span>

                            </div>

                        )}


                        {/* Camera active */}

                        {cameraReady &&
                            !enrollmentComplete && (

                            <div className="camera-live">

                                <span />

                                Camera active

                            </div>

                        )}


                        {/* Face detected */}

                        {faceDetected &&
                            !enrollmentComplete && (

                            <div className="face-detected">

                                <RiCheckLine />

                                Face detected

                            </div>

                        )}


                        {/* Enrollment success */}

                        {enrollmentComplete && (

                            <div className="enrollment-success">

                                <div className="success-icon">
                                    <RiCheckLine />
                                </div>

                                <strong>
                                    Enrollment Complete
                                </strong>

                                <span>
                                    Redirecting to your dashboard...
                                </span>

                            </div>

                        )}

                    </div>


                    {/* =================================================
                        STATUS
                    ================================================= */}

                    <div
                        className={`face-enroll-status ${
                            enrollmentComplete
                                ? "success"
                                : enrolling
                                    ? "active"
                                    : ""
                        }`}
                    >

                        <div className="status-icon">

                            {enrollmentComplete ? (

                                <RiCheckLine />

                            ) : enrolling ? (

                                <RiLoader4Line className="spin" />

                            ) : (

                                <RiCameraLine />

                            )}

                        </div>

                        <div>

                            <strong>
                                {enrollmentComplete
                                    ? "Enrollment successful"
                                    : enrolling
                                        ? "Processing"
                                        : cameraReady
                                            ? "Ready to enroll"
                                            : "Preparing camera"}
                            </strong>

                            <span>
                                {statusMessage}
                            </span>

                        </div>

                    </div>


                    {/* =================================================
                        SECURITY NOTE
                    ================================================= */}

                    <div className="face-security-note">

                        <RiShieldCheckLine />

                        <span>
                            Your face profile is used only
                            for secure identity verification
                            during attendance.
                        </span>

                    </div>


                    {/* =================================================
                        ACTIONS
                    ================================================= */}

                    <div className="face-enroll-actions">

                        <button
                            type="button"
                            className="face-cancel-btn"
                            onClick={handleCancel}
                            disabled={enrolling}
                        >
                            <RiCloseLine />

                            Cancel
                        </button>


                        <button
                            type="button"
                            className="face-enroll-btn"
                            onClick={captureFace}
                            disabled={
                                loading ||
                                enrolling ||
                                !cameraReady ||
                                enrollmentComplete
                            }
                        >

                            {enrolling ? (

                                <>
                                    <RiLoader4Line className="spin" />

                                    Enrolling...
                                </>

                            ) : enrollmentComplete ? (

                                <>
                                    <RiCheckLine />

                                    Enrolled
                                </>

                            ) : (

                                <>
                                    Capture & Enroll

                                    <RiArrowRightLine />
                                </>

                            )}

                        </button>

                    </div>


                    {/* =================================================
                        FOOTER
                    ================================================= */}

                    <div className="face-enroll-footer">

                        <RiCameraLine />

                        <span>
                            Keep your face centered and
                            avoid moving while capturing.
                        </span>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default EnrollFace;