import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { toast } from "react-toastify";
import * as faceapi from "face-api.js";
import {
    RiShieldCheckLine,
    RiUserLine,
    RiCameraLine,
    RiCheckLine,
    RiLoader4Line,
    RiInformationLine,
    RiArrowRightLine,
    RiLockLine,
    RiRefreshLine,
} from "react-icons/ri";

import "./faceEnroll.css";


/* =========================================================
   FACE ENROLLMENT
========================================================= */

const FaceEnroll = () => {

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(false);
    const [modelsLoading, setModelsLoading] = useState(true);
    const [statusMessage, setStatusMessage] =
        useState("Position your face inside the frame.");

    const [faceDetected, setFaceDetected] =
        useState(false);


    /* =========================================================
       LOAD MODELS
    ========================================================= */

    const loadModels = async () => {

        const MODEL_URL = "/models";

        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
    };


    /* =========================================================
       START CAMERA
    ========================================================= */

    const startCamera = async () => {

        try {

            setCameraError(false);
            setCameraReady(false);
            setStatusMessage(
                "Starting camera..."
            );

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

            streamRef.current = stream;

            if (!videoRef.current) return;

            videoRef.current.srcObject = stream;

            await new Promise((resolve) => {

                videoRef.current.onloadedmetadata =
                    resolve;
            });

            await videoRef.current.play();

            setCameraReady(true);

            setStatusMessage(
                "Position your face inside the frame."
            );

        } catch (err) {

            console.error(
                "Camera initialization error:",
                err
            );

            setCameraError(true);

            setStatusMessage(
                "Unable to access your camera."
            );

            toast.error(
                "Camera access is required for face enrollment."
            );
        }
    };


    /* =========================================================
       STOP CAMERA
    ========================================================= */

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


    /* =========================================================
       INITIALIZE
    ========================================================= */

    useEffect(() => {

        let mounted = true;

        const initialize = async () => {

            try {

                setModelsLoading(true);

                await loadModels();

                if (!mounted) return;

                setModelsLoading(false);

                await startCamera();

            } catch (err) {

                console.error(
                    "Face enrollment initialization error:",
                    err
                );

                if (!mounted) return;

                setModelsLoading(false);

                toast.error(
                    "Unable to initialize face enrollment."
                );
            }
        };

        initialize();

        return () => {

            mounted = false;

            stopCamera();
        };

    }, []);


    /* =========================================================
       CAPTURE FACE
    ========================================================= */

    const captureFace = async () => {

        if (loading) return;

        if (!cameraReady) {

            toast.warning(
                "Camera is not ready yet."
            );

            return;
        }

        try {

            setLoading(true);

            setStatusMessage(
                "Scanning your face..."
            );

            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (!video || !canvas) {

                throw new Error(
                    "Camera is unavailable."
                );
            }


            /* -------------------------------------------------
               CAPTURE CURRENT VIDEO FRAME
            ------------------------------------------------- */

            canvas.width =
                video.videoWidth;

            canvas.height =
                video.videoHeight;

            const ctx =
                canvas.getContext("2d");

            ctx.drawImage(
                video,
                0,
                0,
                canvas.width,
                canvas.height
            );


            /* -------------------------------------------------
               FACE DETECTION
            ------------------------------------------------- */

            const detection =
                await faceapi
                    .detectSingleFace(
                        canvas,
                        new faceapi.TinyFaceDetectorOptions({
                            inputSize: 224,
                            scoreThreshold: 0.5,
                        })
                    )
                    .withFaceLandmarks()
                    .withFaceDescriptor();


            if (!detection) {

                setStatusMessage(
                    "No face detected. Please position your face clearly."
                );

                toast.error(
                    "No face detected. Make sure your face is clearly visible."
                );

                setLoading(false);

                return;
            }


            /* -------------------------------------------------
               CHECK FACE SIZE
            ------------------------------------------------- */

            const box =
                detection.detection.box;

            const faceWidthRatio =
                box.width /
                canvas.width;

            const faceHeightRatio =
                box.height /
                canvas.height;


            if (
                faceWidthRatio < 0.20 ||
                faceHeightRatio < 0.20
            ) {

                setStatusMessage(
                    "Move closer to the camera."
                );

                toast.warning(
                    "Your face is too far from the camera."
                );

                setLoading(false);

                return;
            }


            /* -------------------------------------------------
               CONVERT IMAGE TO BLOB
            ------------------------------------------------- */

            const blob =
                await new Promise((resolve) => {

                    canvas.toBlob(
                        resolve,
                        "image/jpeg",
                        0.90
                    );

                });


            if (!blob) {

                throw new Error(
                    "Unable to capture image."
                );
            }


            setStatusMessage(
                "Uploading your face securely..."
            );


            /* -------------------------------------------------
               CLOUDINARY UPLOAD
            ------------------------------------------------- */

            const formData =
                new FormData();

            formData.append(
                "file",
                blob
            );

            formData.append(
                "upload_preset",
                import.meta.env
                    .VITE_CLOUDINARY_PRESET
            );


            const uploadResponse =
                await fetch(
                    import.meta.env
                        .VITE_CLOUDINARY_UPLOAD_URL,
                    {
                        method: "POST",
                        body: formData,
                    }
                );


            if (!uploadResponse.ok) {

                throw new Error(
                    "Face image upload failed."
                );
            }


            const uploadData =
                await uploadResponse.json();


            if (!uploadData.secure_url) {

                throw new Error(
                    "Face image URL was not returned."
                );
            }


            setStatusMessage(
                "Saving your biometric profile..."
            );


            /* -------------------------------------------------
               SEND TO BACKEND
            ------------------------------------------------- */

            await API.post(
                "/auth/enroll-face",
                {
                    faceImage:
                        uploadData.secure_url,

                    faceDescriptor:
                        Array.from(
                            detection.descriptor
                        ),
                }
            );


            /* -------------------------------------------------
               SUCCESS
            ------------------------------------------------- */

            setFaceDetected(true);

            setStatusMessage(
                "Face enrolled successfully!"
            );

            toast.success(
                "Your face has been enrolled successfully."
            );


            stopCamera();


            setTimeout(() => {

                navigate(
                    "/dashboard/student",
                    {
                        replace: true,
                    }
                );

            }, 800);


        } catch (err) {

            console.error(
                "Face enrollment error:",
                err
            );

            const message =
                err?.response?.data?.msg ||
                err?.response?.data?.message ||
                err?.message ||
                "Face enrollment failed.";

            toast.error(message);

            setStatusMessage(
                "Enrollment failed. Please try again."
            );

        } finally {

            setLoading(false);
        }
    };


    /* =========================================================
       RETRY CAMERA
    ========================================================= */

    const retryCamera = async () => {

        stopCamera();

        setCameraError(false);

        await startCamera();
    };


    /* =========================================================
       RENDER
    ========================================================= */

    return (

        <div className="face-enroll-wrapper">

            <div className="face-enroll-card">


                {/* =================================================
                    HEADER
                ================================================= */}

                <div className="face-enroll-header">

                    <div className="face-enroll-icon">
                        <RiShieldCheckLine />
                    </div>

                    <div className="face-enroll-title">

                        <div className="secure-label">
                            <RiLockLine />
                            SECURE BIOMETRIC ENROLLMENT
                        </div>

                        <h2>
                            Enroll Your Face
                        </h2>

                        <p>
                            Your face will be used to securely
                            verify your identity during attendance.
                        </p>

                    </div>

                </div>


                {/* =================================================
                    PROGRESS
                ================================================= */}

                <div className="enroll-progress">

                    <div className="enroll-progress-step active">

                        <div className="enroll-step-circle">
                            <RiUserLine />
                        </div>

                        <span>
                            Face
                        </span>

                    </div>


                    <div className="enroll-progress-line" />


                    <div className="enroll-progress-step">

                        <div className="enroll-step-circle">
                            <RiCheckLine />
                        </div>

                        <span>
                            Complete
                        </span>

                    </div>

                </div>


                {/* =================================================
                    CAMERA SECTION
                ================================================= */}

                <div className="face-enroll-section">

                    <div className="section-heading">

                        <div>

                            <span className="section-kicker">
                                BIOMETRIC SETUP
                            </span>

                            <h3>
                                Position your face
                            </h3>

                            <p>
                                Look directly at the camera
                                and keep your face still.
                            </p>

                        </div>

                        <div className="section-icon">
                            <RiCameraLine />
                        </div>

                    </div>


                    {/* CAMERA */}

                    <div className="face-camera-container">

                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="face-enroll-video"
                        />

                        <canvas
                            ref={canvasRef}
                            className="hidden-canvas"
                        />


                        {/* CAMERA OVERLAY */}

                        {!cameraError &&
                            !faceDetected && (

                                <>

                                    <div className="camera-gradient" />

                                    <div className="face-guide">

                                        <div className="face-corner top-left" />
                                        <div className="face-corner top-right" />
                                        <div className="face-corner bottom-left" />
                                        <div className="face-corner bottom-right" />

                                        <div className="face-outline" />

                                    </div>


                                    <div className="camera-top-status">

                                        <span
                                            className={`camera-live-dot ${
                                                cameraReady
                                                    ? "ready"
                                                    : ""
                                            }`}
                                        />

                                        {cameraReady
                                            ? "Camera ready"
                                            : "Starting camera..."}

                                    </div>


                                    <div className="camera-status">

                                        <RiInformationLine />

                                        <span>
                                            {statusMessage}
                                        </span>

                                    </div>

                                </>
                            )}


                        {/* SUCCESS */}

                        {faceDetected && (

                            <div className="enroll-success-overlay">

                                <div className="enroll-success-icon">
                                    <RiCheckLine />
                                </div>

                                <strong>
                                    Face enrolled successfully
                                </strong>

                            </div>

                        )}


                        {/* CAMERA ERROR */}

                        {cameraError && (

                            <div className="camera-error-overlay">

                                <RiCameraLine />

                                <strong>
                                    Camera unavailable
                                </strong>

                                <span>
                                    Please allow camera access
                                    and try again.
                                </span>

                                <button
                                    type="button"
                                    className="retry-camera-btn"
                                    onClick={retryCamera}
                                >
                                    <RiRefreshLine />
                                    Try Again
                                </button>

                            </div>

                        )}


                        {/* MODEL LOADING */}

                        {modelsLoading && (

                            <div className="camera-loading-overlay">

                                <RiLoader4Line className="spin" />

                                <span>
                                    Preparing face recognition...
                                </span>

                            </div>

                        )}

                    </div>


                    {/* TIP */}

                    <div className="enrollment-tip">

                        <RiInformationLine />

                        <div>

                            <strong>
                                For the best result
                            </strong>

                            <span>
                                Make sure your face is clearly
                                visible, well lit, and not covered
                                by anything.
                            </span>

                        </div>

                    </div>


                    {/* ACTION */}

                    <button
                        type="button"
                        className="face-enroll-btn"
                        onClick={captureFace}
                        disabled={
                            loading ||
                            !cameraReady ||
                            modelsLoading ||
                            faceDetected
                        }
                    >

                        {loading ? (

                            <>
                                <RiLoader4Line className="spin" />
                                Processing enrollment...
                            </>

                        ) : faceDetected ? (

                            <>
                                <RiCheckLine />
                                Enrollment Complete
                            </>

                        ) : (

                            <>
                                Capture & Enroll Face
                                <RiArrowRightLine />
                            </>

                        )}

                    </button>

                </div>


                {/* SECURITY NOTE */}

                <div className="enrollment-security-note">

                    <RiShieldCheckLine />

                    <span>
                        Your biometric descriptor is used for
                        identity verification during attendance.
                    </span>

                </div>

            </div>

        </div>
    );
};

export default FaceEnroll;

