import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../api/api";
import { Modal, Button } from "react-bootstrap";
import { Html5Qrcode } from "html5-qrcode";
import * as faceapi from "face-api.js";
import { toast } from "react-toastify";
import socket from "../../socket";

import {
    RiQrScan2Line,
    RiShieldCheckLine,
    RiUserLine,
    RiMapPinRangeLine,
    RiCheckLine,
    RiLoader4Line,
    RiGpsLine,
    RiCameraLine,
    RiInformationLine,
    RiArrowRightLine,
    RiLockLine,
} from "react-icons/ri";

import "./StudentScanPage.css";
import AttendanceMap from "../../components/AttendanceMap";


/* =========================================================
   FACE MODELS
========================================================= */

const loadFaceModels = async () => {
    const MODEL_URL = "/models";

    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    ]);
};


/* =========================================================
   COMPONENT
========================================================= */

const StudentScanPage = () => {

    const { sessionToken } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const videoRef = useRef(null);
    const html5QrCodeRef = useRef(null);
    const streamRef = useRef(null);

    const scanningLockedRef = useRef(false);
    const geofenceExitTimeoutRef = useRef(null);
    const geofenceIntervalRef = useRef(null);

    /* =====================================================
       STATE
    ===================================================== */

    const [statusMessage, setStatusMessage] =
        useState("Position your face properly");

    const [sessionInfo, setSessionInfo] =
        useState(null);

    const [faceVerified, setFaceVerified] =
        useState(false);

    const [faceLoading, setFaceLoading] =
        useState(false);

    const [insideGeofence, setInsideGeofence] =
        useState(false);

    const [studentLocation, setStudentLocation] =
        useState(null);

    const [locationReady, setLocationReady] =
        useState(false);

    const [lecturerLocation, setLecturerLocation] =
        useState(null);

    const [graceCountdown, setGraceCountdown] =
        useState(null);

    const [shouldNavigate, setShouldNavigate] =
        useState(false);

    const [modalShow, setModalShow] =
        useState(false);

    const [modalMsg, setModalMsg] =
        useState("");

    const [scannerReady, setScannerReady] =
        useState(false);

    const geofenceGraceSeconds = 10;


    /* =====================================================
       CURRENT STEP
    ===================================================== */

    const currentStep = !faceVerified
        ? 1
        : !locationReady || !insideGeofence
            ? 2
            : 3;


    /* =====================================================
       FETCH SESSION
    ===================================================== */

    useEffect(() => {

        if (!sessionToken) {
            toast.error("Invalid session URL");
            return;
        }

        const fetchSession = async () => {

            try {

                const token = localStorage.getItem("token");

                const res = await api.get(
                    `/sessions/${sessionToken}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const session = res.data.session;

                if (!session || session.status === "expired") {

                    toast.warn(
                        "This attendance session has expired or is no longer available."
                    );

                    return;
                }

                const faceRes = await api.get(
                    `/sessions/${sessionToken}/student`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const studentFaceDescriptor =
                    faceRes.data.studentFaceDescriptor;

                if (
                    !studentFaceDescriptor ||
                    studentFaceDescriptor.length !== 128
                ) {

                    toast.error(
                        "Your face verification profile is unavailable."
                    );

                    return;
                }

                setSessionInfo({
                    ...session,
                    studentFaceDescriptor,
                });

            } catch (err) {

                console.error(err);

                toast.error(
                    "Unable to load attendance session."
                );
            }
        };

        fetchSession();

    }, [sessionToken]);


    /* =====================================================
       SOCKET LOCATION
    ===================================================== */

    useEffect(() => {

        if (!sessionToken) return;

        socket.emit(
            "join-course",
            sessionToken
        );

        const handleLocation = (loc) => {

            setLecturerLocation(loc);
        };

        socket.on(
            "student-receive-location",
            handleLocation
        );

        return () => {

            socket.emit(
                "leave-course",
                sessionToken
            );

            socket.off(
                "student-receive-location",
                handleLocation
            );
        };

    }, [sessionToken]);


    /* =====================================================
       INITIAL LECTURER LOCATION
    ===================================================== */

    useEffect(() => {

        if (sessionInfo?.location) {

            setLecturerLocation({
                lat: sessionInfo.location.lat,
                lng: sessionInfo.location.lng,
            });
        }

    }, [sessionInfo]);


    /* =====================================================
       ALREADY MARKED
    ===================================================== */

    useEffect(() => {

        if (location.state?.alreadyMarked) {

            setModalMsg(
                "Attendance has already been recorded for this session."
            );

            setModalShow(true);
        }

    }, [location.state]);


    /* =====================================================
       FACE CAMERA
    ===================================================== */

    useEffect(() => {

        let mounted = true;

        const initCamera = async () => {

            try {

                await loadFaceModels();

                if (!mounted) return;

                const stream =
                    await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: "user",
                        },
                        audio: false,
                    });

                streamRef.current = stream;

                if (videoRef.current) {

                    videoRef.current.srcObject =
                        stream;

                    await new Promise((resolve) => {

                        videoRef.current.onloadedmetadata =
                            resolve;
                    });

                    await videoRef.current.play();
                }

            } catch (err) {

                console.error(
                    "Camera initialization error:",
                    err
                );

                toast.error(
                    "Unable to access your camera. Please allow camera permission."
                );
            }
        };

        initCamera();

        return () => {

            mounted = false;

            fullCleanup();
        };

    }, []);


    /* =====================================================
       STOP VIDEO
    ===================================================== */

    const stopVideoStream = () => {

        if (streamRef.current) {

            streamRef.current
                .getTracks()
                .forEach((track) => track.stop());

            streamRef.current = null;
        }

        if (videoRef.current) {

            videoRef.current.srcObject = null;
        }
    };


    /* =====================================================
       FULL CLEANUP
    ===================================================== */

    const fullCleanup = async () => {

        stopVideoStream();

        if (html5QrCodeRef.current) {

            try {

                await html5QrCodeRef.current.stop();

                html5QrCodeRef.current.clear();

            } catch (err) {

                console.warn(
                    "QR cleanup error:",
                    err
                );
            }

            html5QrCodeRef.current = null;
        }

        if (geofenceExitTimeoutRef.current) {

            clearTimeout(
                geofenceExitTimeoutRef.current
            );

            geofenceExitTimeoutRef.current = null;
        }

        if (geofenceIntervalRef.current) {

            clearInterval(
                geofenceIntervalRef.current
            );

            geofenceIntervalRef.current = null;
        }

        scanningLockedRef.current = true;
    };


    /* =====================================================
       FACE VERIFICATION
    ===================================================== */

    const verifyFace = async () => {

        if (faceLoading) return;

        if (
            !sessionInfo ||
            !videoRef.current
        ) {
            return;
        }

        setFaceLoading(true);

        setStatusMessage(
            "Positioning your face..."
        );

        try {

            const video = videoRef.current;

            const storedDescriptor =
                new Float32Array(
                    sessionInfo.studentFaceDescriptor
                );

            const faceMatcher =
                new faceapi.FaceMatcher(
                    [
                        new faceapi.LabeledFaceDescriptors(
                            "student",
                            [storedDescriptor]
                        ),
                    ],
                    0.45
                );

            let recognized = false;

            let baseNoseX = null;
            let baseNoseY = null;

            let headMoveFrames = 0;

            const startTime = Date.now();

            const TIMEOUT = 20000;

            const directions = [
                "left",
                "right",
                "down",
            ];

            const targetDirection =
                directions[
                Math.floor(
                    Math.random() *
                    directions.length
                )
                ];


            const detectLoop = async () => {

                if (!videoRef.current) return;

                if (
                    recognized ||
                    Date.now() - startTime > TIMEOUT
                ) {

                    if (!recognized) {

                        setStatusMessage(
                            "Verification timed out. Please try again."
                        );

                        toast.error(
                            "Face verification failed."
                        );
                    }

                    setFaceLoading(false);

                    return;
                }


                const detection =
                    await faceapi
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

                    setStatusMessage(
                        "Make sure your face is clearly visible..."
                    );

                    return requestAnimationFrame(
                        detectLoop
                    );
                }


                const bestMatch =
                    faceMatcher.findBestMatch(
                        detection.descriptor
                    );


                if (
                    bestMatch.label === "student"
                ) {

                    const nose =
                        detection.landmarks.getNose();

                    const noseX =
                        video.videoWidth -
                        nose[3].x;

                    const noseY =
                        nose[3].y;


                    if (baseNoseX === null)
                        baseNoseX = noseX;

                    if (baseNoseY === null)
                        baseNoseY = noseY;


                    const thresholdX =
                        video.videoWidth / 20;

                    const thresholdY =
                        video.videoHeight / 25;


                    let movedCorrectDirection =
                        false;


                    switch (
                    targetDirection
                    ) {

                        case "left":

                            movedCorrectDirection =
                                noseX <
                                baseNoseX -
                                thresholdX;

                            break;


                        case "right":

                            movedCorrectDirection =
                                noseX >
                                baseNoseX +
                                thresholdX;

                            break;


                        case "down":

                            movedCorrectDirection =
                                noseY >
                                baseNoseY +
                                thresholdY;

                            break;


                        default:

                            break;
                    }


                    if (
                        movedCorrectDirection
                    ) {

                        headMoveFrames++;

                    } else {

                        headMoveFrames = 0;
                    }


                    if (
                        headMoveFrames >= 3
                    ) {

                        recognized = true;

                        setStatusMessage(
                            "Identity verified successfully."
                        );

                        try {

                            await api.post(
                                "/auth/verify-face",
                                {
                                    faceDescriptor:
                                        Array.from(
                                            detection.descriptor
                                        ),
                                }
                            );

                            setFaceVerified(
                                true
                            );

                            toast.success(
                                "Face verified successfully"
                            );

                            stopVideoStream();

                        } catch (err) {

                            console.error(err);

                            toast.error(
                                "Face verification could not be completed."
                            );

                            setFaceLoading(false);
                        }

                        return;
                    }


                    setStatusMessage(

                        targetDirection === "down"

                            ? "Please nod slightly downward..."

                            : `Please turn your head slightly ${targetDirection}...`
                    );

                } else {

                    setStatusMessage(
                        "Face does not match your registered profile."
                    );
                }


                requestAnimationFrame(
                    detectLoop
                );
            };


            detectLoop();

        } catch (err) {

            console.error(err);

            toast.error(
                "Face verification failed."
            );

            setFaceLoading(false);
        }
    };


    /* =====================================================
       GEOFENCE CONTROL
    ===================================================== */

    useEffect(() => {

        if (
            !faceVerified ||
            !locationReady ||
            !studentLocation
        ) {
            return;
        }


        if (geofenceIntervalRef.current) {

            clearInterval(
                geofenceIntervalRef.current
            );

            geofenceIntervalRef.current =
                null;
        }


        if (insideGeofence) {

            setGraceCountdown(null);

            setStatusMessage(
                "Location verified. Attendance zone confirmed."
            );


            if (
                geofenceExitTimeoutRef.current
            ) {

                clearTimeout(
                    geofenceExitTimeoutRef.current
                );

                geofenceExitTimeoutRef.current =
                    null;
            }


            startScanner();

        } else {

            if (
                geofenceExitTimeoutRef.current
            ) {
                return;
            }


            let countdown =
                geofenceGraceSeconds;

            setGraceCountdown(
                countdown
            );


            geofenceIntervalRef.current =
                setInterval(() => {

                    countdown--;

                    if (countdown > 0) {

                        setGraceCountdown(
                            countdown
                        );
                    }

                }, 1000);


            geofenceExitTimeoutRef.current =
                setTimeout(async () => {

                    if (
                        html5QrCodeRef.current
                    ) {

                        try {

                            await html5QrCodeRef.current.stop();

                            html5QrCodeRef.current.clear();

                        } catch (err) {

                            console.warn(err);
                        }

                        html5QrCodeRef.current =
                            null;
                    }


                    setScannerReady(false);

                    setGraceCountdown(null);

                    setStatusMessage(
                        "You left the attendance zone. Move closer to continue."
                    );


                    if (
                        geofenceIntervalRef.current
                    ) {

                        clearInterval(
                            geofenceIntervalRef.current
                        );

                        geofenceIntervalRef.current =
                            null;
                    }

                }, geofenceGraceSeconds * 1000);
        }


        return () => {

            if (
                geofenceIntervalRef.current
            ) {

                clearInterval(
                    geofenceIntervalRef.current
                );
            }

            if (
                geofenceExitTimeoutRef.current
            ) {

                clearTimeout(
                    geofenceExitTimeoutRef.current
                );
            }
        };

    }, [
        insideGeofence,
        faceVerified,
        locationReady,
        studentLocation,
    ]);


    /* =====================================================
       QR SCANNER
    ===================================================== */

    const startScanner = async () => {

        if (
            !insideGeofence ||
            scanningLockedRef.current
        ) {
            return;
        }


        const readerEl =
            document.getElementById(
                "reader"
            );

        if (!readerEl) return;

        if (
            html5QrCodeRef.current
        ) {
            return;
        }


        try {

            const qr =
                new Html5Qrcode(
                    "reader"
                );

            html5QrCodeRef.current =
                qr;


            await qr.start(
                {
                    facingMode: {
                        ideal: "environment",
                    },
                },
                {
                    fps: 10,

                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const size =
                            Math.floor(
                                Math.min(
                                    viewfinderWidth,
                                    viewfinderHeight
                                ) * 0.60
                            );

                        return {
                            width: size,
                            height: size,
                        };
                    },

                    aspectRatio: 1.777778,

                    disableFlip: true,
                },

                async (decodedText) => {

                    if (
                        scanningLockedRef.current
                    ) {
                        return;
                    }


                    scanningLockedRef.current =
                        true;


                    const scannedToken =
                        decodedText
                            .split("/")
                            .pop();


                    try {

                        const res =
                            await markAttendance(
                                scannedToken
                            );


                        setModalMsg(
                            res.msg ||
                            "Attendance recorded successfully."
                        );

                        setModalShow(
                            true
                        );


                        await qr.stop();

                        qr.clear();

                        html5QrCodeRef.current =
                            null;

                        setScannerReady(
                            false
                        );

                    } catch (err) {

                        toast.error(
                            err?.response?.data?.msg ||
                            err?.message ||
                            "Failed to mark attendance."
                        );

                        scanningLockedRef.current =
                            false;
                    }
                }
            );


            setScannerReady(true);

        } catch (err) {

            console.error(
                "QR scanner error:",
                err
            );

            toast.error(
                "Unable to start QR scanner."
            );

            html5QrCodeRef.current =
                null;

            scanningLockedRef.current =
                false;

            setScannerReady(false);
        }
    };


    /* =====================================================
       MARK ATTENDANCE
    ===================================================== */

    const markAttendance =
        async (scannedToken) => {

            if (!sessionInfo) {

                throw new Error(
                    "Session information unavailable."
                );
            }


            if (
                !studentLocation ||
                !locationReady
            ) {

                throw new Error(
                    "GPS location is not ready."
                );
            }


            if (
                studentLocation.accuracy >
                300
            ) {

                throw new Error(
                    "GPS accuracy is too low. Please stay still and try again."
                );
            }


            const token =
                localStorage.getItem(
                    "token"
                );


            const res =
                await api.post(

                    `/sessions/scan/${scannedToken}`,

                    {
                        location: {
                            lat:
                                studentLocation.lat,

                            lng:
                                studentLocation.lng,

                            accuracy:
                                Math.min(
                                    studentLocation.accuracy,
                                    200
                                ),
                        },
                    },

                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );


            return res.data;
        };


    /* =====================================================
       NAVIGATION
    ===================================================== */

    useEffect(() => {

        if (!shouldNavigate) return;

        fullCleanup().finally(() => {

            navigate(
                "/dashboard/student",
                {
                    replace: true,
                }
            );
        });

    }, [
        shouldNavigate,
        navigate,
    ]);


    /* =====================================================
       RENDER
    ===================================================== */

    return (

        <div className="student-scan-wrapper">

            <div className="student-scan-card">


                {/* =================================================
                    HEADER
                ================================================= */}

                <div className="scan-header">

                    <div className="scan-header-icon">
                        <RiShieldCheckLine />
                    </div>

                    <div className="scan-header-content">

                        <div className="secure-label">
                            <RiLockLine />
                            SECURE ATTENDANCE
                        </div>

                        <h2>
                            Attendance Verification
                        </h2>

                        <p>
                            Verify your identity and location
                            before scanning the attendance QR code.
                        </p>

                    </div>

                </div>


                {/* =================================================
                    PROGRESS
                ================================================= */}

                <div className="verification-progress">

                    <div
                        className={`progress-step ${currentStep >= 1
                            ? "active"
                            : ""
                            } ${currentStep > 1
                                ? "completed"
                                : ""
                            }`}
                    >

                        <div className="step-circle">

                            {currentStep > 1
                                ? <RiCheckLine />
                                : <RiUserLine />
                            }

                        </div>

                        <span>
                            Identity
                        </span>

                    </div>


                    <div className="step-line">
                        <span
                            className={
                                currentStep > 1
                                    ? "filled"
                                    : ""
                            }
                        />
                    </div>


                    <div
                        className={`progress-step ${currentStep >= 2
                            ? "active"
                            : ""
                            } ${currentStep > 2
                                ? "completed"
                                : ""
                            }`}
                    >

                        <div className="step-circle">

                            {currentStep > 2
                                ? <RiCheckLine />
                                : <RiMapPinRangeLine />
                            }

                        </div>

                        <span>
                            Location
                        </span>

                    </div>


                    <div className="step-line">

                        <span
                            className={
                                currentStep > 2
                                    ? "filled"
                                    : ""
                            }
                        />

                    </div>


                    <div
                        className={`progress-step ${currentStep >= 3
                            ? "active"
                            : ""
                            }`}
                    >

                        <div className="step-circle">

                            <RiQrScan2Line />

                        </div>

                        <span>
                            Scan
                        </span>

                    </div>

                </div>


                {/* =================================================
                    FACE VERIFICATION
                ================================================= */}

                {!faceVerified && (

                    <div className="verification-section">

                        <div className="section-heading">

                            <div>

                                <span className="section-kicker">
                                    STEP 1 OF 3
                                </span>

                                <h3>
                                    Verify your identity
                                </h3>

                                <p>
                                    Look directly at the camera.
                                    You'll be asked to make a small
                                    head movement.
                                </p>

                            </div>

                            <div className="section-icon">
                                <RiUserLine />
                            </div>

                        </div>


                        <div className="face-camera-container">

                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="login-face-video"
                            />


                            <div className="camera-gradient" />


                            <div className="face-guide">

                                <div className="face-corner top-left" />
                                <div className="face-corner top-right" />
                                <div className="face-corner bottom-left" />
                                <div className="face-corner bottom-right" />

                                <div className="face-outline" />

                            </div>


                            <div className="camera-top-status">

                                <span className="camera-live-dot" />

                                Camera active

                            </div>


                            <div className="login-status-overlay">

                                <RiInformationLine />

                                <span>
                                    {statusMessage}
                                </span>

                            </div>

                        </div>


                        <div className="verification-tip">

                            <RiCameraLine />

                            <span>
                                Make sure your face is clearly
                                visible and well lit.
                            </span>

                        </div>


                        <button
                            className="premium-action-btn"
                            onClick={verifyFace}
                            disabled={faceLoading}
                        >

                            {faceLoading ? (

                                <>
                                    <RiLoader4Line className="spin" />

                                    Verifying identity...
                                </>

                            ) : (

                                <>
                                    Verify My Face
                                    <RiArrowRightLine />
                                </>

                            )}

                        </button>

                    </div>

                )}


                {/* =================================================
                    LOCATION + QR
                ================================================= */}

                {faceVerified &&
                    sessionInfo?.location && (

                        <div className="verification-section">

                            <div className="section-heading">

                                <div>

                                    <span className="section-kicker">
                                        STEP {insideGeofence ? "3" : "2"} OF 3
                                    </span>

                                    <h3>
                                        {insideGeofence
                                            ? "Ready to scan"
                                            : "Confirm your location"}
                                    </h3>

                                    <p>

                                        {insideGeofence
                                            ? "Your location has been verified. Position the QR code inside the frame."
                                            : "You must be inside the lecturer's attendance zone before scanning."}

                                    </p>

                                </div>


                                <div
                                    className={`section-icon ${insideGeofence
                                        ? "success"
                                        : ""
                                        }`}
                                >

                                    {insideGeofence
                                        ? <RiCheckLine />
                                        : <RiMapPinRangeLine />
                                    }

                                </div>

                            </div>


                            {/* GPS STATUS */}

                            <div
                                className={`location-status ${insideGeofence
                                    ? "location-success"
                                    : "location-warning"
                                    }`}
                            >

                                <div className="location-status-icon">

                                    {insideGeofence
                                        ? <RiGpsLine />
                                        : <RiMapPinRangeLine />
                                    }

                                </div>


                                <div className="location-status-content">

                                    <strong>

                                        {insideGeofence
                                            ? "Attendance zone confirmed"
                                            : locationReady
                                                ? "Move closer to the attendance zone"
                                                : "Detecting your location..."}

                                    </strong>


                                    <span>

                                        {insideGeofence

                                            ? "GPS verification passed. QR scanning is unlocked."

                                            : graceCountdown !== null

                                                ? `Scanner will stop in ${graceCountdown}s if you remain outside.`

                                                : "Your GPS position is being checked against the lecturer's location."}

                                    </span>

                                </div>


                                {locationReady && (

                                    <div
                                        className={`gps-dot ${insideGeofence
                                            ? "good"
                                            : "warning"
                                            }`}
                                    />

                                )}

                            </div>


                            {/* MAP */}

                            <div className="attendance-map-container">

                                <AttendanceMap
                                    sessionLocation={
                                        sessionInfo.location
                                    }

                                    onInsideChange={
                                        setInsideGeofence
                                    }

                                    onLocationChange={
                                        setStudentLocation
                                    }

                                    onGpsReady={
                                        setLocationReady
                                    }

                                    lecturerLocation={
                                        lecturerLocation
                                    }
                                />

                            </div>


                            {/* QR */}

                            {insideGeofence && (

                                <div className="qr-section">

                                    <div className="qr-section-header">

                                        <div>

                                            <span className="section-kicker">
                                                FINAL STEP
                                            </span>

                                            <h4>
                                                Scan attendance QR
                                            </h4>

                                        </div>


                                        <div className="qr-ready-badge">

                                            <span />

                                            {scannerReady
                                                ? "Scanner ready"
                                                : "Starting scanner..."}

                                        </div>

                                    </div>


                                    <div className="qr-scanner-shell">

                                        <div
                                            id="reader"
                                            className="qr-reader"
                                        />

                                        <div className="qr-frame-overlay">

                                            <span className="qr-corner tl" />
                                            <span className="qr-corner tr" />
                                            <span className="qr-corner bl" />
                                            <span className="qr-corner br" />

                                            <div className="qr-scan-line" />

                                        </div>

                                    </div>


                                    <div className="qr-instruction">

                                        <RiQrScan2Line />

                                        <span>
                                            Place the lecturer's QR code
                                            inside the frame
                                        </span>

                                    </div>

                                </div>

                            )}

                        </div>
                    )}


                {/* =================================================
                    SUCCESS MODAL
                ================================================= */}

                <Modal
                    show={modalShow}
                    centered
                    backdrop="static"
                    keyboard={false}
                    dialogClassName="success-modal"
                >

                    <Modal.Body className="success-body">

                        <div className="success-animation">

                            <div className="success-icon">
                                <RiCheckLine />
                            </div>

                        </div>


                        <span className="success-kicker">
                            ATTENDANCE CONFIRMED
                        </span>


                        <h4 className="success-title">

                            {modalMsg
                                ?.toLowerCase()
                                .includes("already")
                                ? "Already Recorded"
                                : "Attendance Marked"}

                        </h4>


                        <p className="success-text">
                            {modalMsg}
                        </p>


                        <Button
                            className="success-btn"
                            onClick={() => {

                                setModalShow(false);

                                if (
                                    !modalMsg
                                        ?.toLowerCase()
                                        .includes("already")
                                ) {

                                    setShouldNavigate(
                                        true
                                    );
                                }

                            }}
                        >

                            {modalMsg
                                ?.toLowerCase()
                                .includes("already")
                                ? "Close"
                                : "Return to Dashboard"}

                            <RiArrowRightLine />

                        </Button>

                    </Modal.Body>

                </Modal>

            </div>

        </div>
    );
};

export default StudentScanPage;