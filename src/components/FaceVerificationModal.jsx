// FaceVerificationModal.jsx

import React, { useEffect, useRef, useState } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import * as faceapi from "face-api.js";
import API from "../api/api";
import { toast } from "react-toastify";
import {
    RiShieldCheckLine,
    RiUserLine,
    RiCameraLine,
    RiInformationLine,
    RiCheckLine,
    RiLoader4Line,
    RiArrowRightLine,
    RiCloseLine,
} from "react-icons/ri";

import "./faceVerificationModal.css";


/* =========================================================
   FACE MODELS
========================================================= */

const loadFaceModels = async () => {

    const MODEL_URL = "/models";

    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
};


/* =========================================================
   COMPONENT
========================================================= */

const FaceVerificationModal = ({
    show,
    onClose,
    user,
    onVerified,
}) => {

    const videoRef = useRef(null);

    const streamRef = useRef(null);

    const animationFrameRef = useRef(null);

    const mountedRef = useRef(false);

    const verificationLockedRef = useRef(false);


    const [loading, setLoading] =
        useState(true);

    const [verifying, setVerifying] =
        useState(false);

    const [status, setStatus] =
        useState("Preparing secure verification...");

    const [cameraReady, setCameraReady] =
        useState(false);

    const [challenge, setChallenge] =
        useState(null);

    const [faceDetected, setFaceDetected] =
        useState(false);

    const [verificationComplete, setVerificationComplete] =
        useState(false);


    /* =====================================================
       CAMERA CLEANUP
    ===================================================== */

    const stopCamera = () => {

        if (animationFrameRef.current) {

            cancelAnimationFrame(
                animationFrameRef.current
            );

            animationFrameRef.current = null;
        }


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


    /* =====================================================
       INITIALIZE CAMERA
    ===================================================== */

    useEffect(() => {

        if (!show) return;

        mountedRef.current = true;

        verificationLockedRef.current = false;

        setLoading(true);

        setVerifying(false);

        setVerificationComplete(false);

        setFaceDetected(false);

        setChallenge(null);

        setStatus(
            "Preparing secure verification..."
        );


        const initialize = async () => {

            try {

                /* Load models */

                setStatus(
                    "Loading face verification..."
                );

                await loadFaceModels();

                if (!mountedRef.current) return;


                /* Request camera */

                setStatus(
                    "Requesting camera access..."
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


                if (!mountedRef.current) {

                    stream
                        .getTracks()
                        .forEach((track) =>
                            track.stop()
                        );

                    return;
                }


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


                setCameraReady(true);

                setLoading(false);

                setStatus(
                    "Position your face inside the frame."
                );


            } catch (err) {

                console.error(
                    "Face verification initialization error:",
                    err
                );

                setLoading(false);

                setStatus(
                    "Unable to initialize camera."
                );

                toast.error(
                    "Unable to access your camera. Please allow camera permission."
                );

                stopCamera();

            }

        };


        initialize();


        return () => {

            mountedRef.current = false;

            verificationLockedRef.current = true;

            stopCamera();

        };

    }, [show]);


    /* =====================================================
       CLOSE MODAL
    ===================================================== */

    const handleClose = () => {

        verificationLockedRef.current = true;

        stopCamera();

        onClose?.();
    };


    /* =====================================================
       FACE VERIFICATION
    ===================================================== */

    const verifyFace = async () => {

        if (loading || verifying) return;

        if (verificationLockedRef.current) return;


        if (
            !user?.faceDescriptor ||
            user.faceDescriptor.length !== 128
        ) {

            toast.error(
                "No valid face profile is available for verification."
            );

            return;
        }


        if (!videoRef.current || !cameraReady) {

            toast.error(
                "Camera is not ready yet."
            );

            return;
        }


        verificationLockedRef.current = true;

        setVerifying(true);

        setFaceDetected(false);

        setStatus(
            "Detecting your face..."
        );


        try {

            const video =
                videoRef.current;


            const storedDescriptor =
                new Float32Array(
                    user.faceDescriptor
                );


            const faceMatcher =
                new faceapi.FaceMatcher(

                    [
                        new faceapi.LabeledFaceDescriptors(
                            String(user.id),
                            [
                                storedDescriptor,
                            ]
                        ),
                    ],

                    0.45
                );


            /*
             * Random liveness challenge.
             */

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


            setChallenge(
                targetDirection
            );


            let baseNoseX = null;

            let baseNoseY = null;

            let headMoveFrames = 0;

            let recognized = false;

            const startTime =
                Date.now();

            const TIMEOUT =
                20000;


            const detectLoop = async () => {

                if (
                    !mountedRef.current ||
                    verificationLockedRef.current === false &&
                    false
                ) {
                    return;
                }


                if (
                    recognized ||
                    Date.now() - startTime >
                    TIMEOUT
                ) {

                    if (!recognized) {

                        setStatus(
                            "Verification timed out. Please try again."
                        );

                        toast.error(
                            "Face verification failed."
                        );

                        setVerifying(false);

                        setChallenge(null);

                        verificationLockedRef.current =
                            false;
                    }

                    return;
                }


                if (!videoRef.current) {

                    setVerifying(false);

                    verificationLockedRef.current =
                        false;

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


                if (!mountedRef.current) return;


                if (!detection) {

                    setFaceDetected(false);

                    setStatus(
                        "No face detected. Position your face clearly inside the frame."
                    );

                    animationFrameRef.current =
                        requestAnimationFrame(
                            detectLoop
                        );

                    return;
                }


                setFaceDetected(true);


                const bestMatch =
                    faceMatcher.findBestMatch(
                        detection.descriptor
                    );


                if (
                    bestMatch.label !==
                    String(user.id)
                ) {

                    setStatus(
                        "Face does not match your registered profile."
                    );

                    animationFrameRef.current =
                        requestAnimationFrame(
                            detectLoop
                        );

                    return;
                }


                /*
                 * Face matches.
                 */

                const nose =
                    detection.landmarks.getNose();


                const noseX =
                    video.videoWidth -
                    nose[3].x;


                const noseY =
                    nose[3].y;


                if (baseNoseX === null) {

                    baseNoseX = noseX;
                }


                if (baseNoseY === null) {

                    baseNoseY = noseY;
                }


                const thresholdX =
                    video.videoWidth / 20;


                const thresholdY =
                    video.videoHeight / 25;


                let movedCorrectDirection =
                    false;


                switch (targetDirection) {

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


                if (movedCorrectDirection) {

                    headMoveFrames++;

                } else {

                    headMoveFrames = 0;
                }


                if (
                    headMoveFrames >= 3
                ) {

                    recognized = true;

                    setChallenge(null);

                    setStatus(
                        "Identity verified. Completing secure verification..."
                    );


                    try {

                        await API.post(
                            "/auth/verify-face",
                            {
                                faceDescriptor:
                                    Array.from(
                                        detection.descriptor
                                    ),
                            }
                        );


                        if (!mountedRef.current) return;


                        setVerificationComplete(
                            true
                        );

                        setVerifying(false);

                        setStatus(
                            "Face verification successful."
                        );


                        toast.success(
                            "Face verified successfully."
                        );


                        stopCamera();


                        setTimeout(() => {

                            if (mountedRef.current) {

                                onVerified?.();
                            }

                        }, 600);


                    } catch (err) {

                        console.error(
                            "Server face verification error:",
                            err
                        );

                        setStatus(
                            "Server verification failed. Please try again."
                        );

                        toast.error(
                            err?.response?.data?.msg ||
                            "Face verification failed on the server."
                        );


                        setVerifying(false);

                        verificationLockedRef.current =
                            false;

                        setChallenge(null);
                    }


                    return;
                }


                /*
                 * User has the correct face.
                 * Now give the liveness instruction.
                 */

                if (targetDirection === "down") {

                    setStatus(
                        "Please nod your head slightly downward."
                    );

                } else {

                    setStatus(
                        `Please turn your head slightly ${targetDirection}.`
                    );
                }


                animationFrameRef.current =
                    requestAnimationFrame(
                        detectLoop
                    );
            };


            /*
             * Start detection.
             */

            detectLoop();


        } catch (err) {

            console.error(
                "Face verification error:",
                err
            );

            toast.error(
                "Face verification failed. Please try again."
            );

            setStatus(
                "Verification failed. Please try again."
            );

            setVerifying(false);

            setChallenge(null);

            verificationLockedRef.current =
                false;
        }
    };


    /* =====================================================
       RENDER
    ===================================================== */

    return (

        <Modal
            show={show}
            onHide={handleClose}
            centered
            backdrop="static"
            keyboard={!verifying}
            dialogClassName="face-verification-modal"
        >

            <Modal.Header
                closeButton={!verifying}
                className="face-modal-header"
            >

                <div className="face-modal-title">

                    <div className="face-modal-title-icon">

                        <RiShieldCheckLine />

                    </div>

                    <div>

                        <span>
                            SECURE VERIFICATION
                        </span>

                        <h5>
                            Verify Your Identity
                        </h5>

                    </div>

                </div>

            </Modal.Header>


            <Modal.Body>

                {/* ===============================
                    INTRO
                =============================== */}

                <div className="face-modal-intro">

                    <RiUserLine />

                    <div>

                        <strong>
                            Face verification required
                        </strong>

                        <p>
                            Look directly at the camera.
                            You will be asked to make a
                            small head movement.
                        </p>

                    </div>

                </div>


                {/* ===============================
                    CAMERA
                =============================== */}

                <div className="face-modal-camera">

                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="face-verification-video"
                    />


                    <div className="face-camera-overlay" />


                    <div className="face-guide">

                        <div className="face-corner top-left" />

                        <div className="face-corner top-right" />

                        <div className="face-corner bottom-left" />

                        <div className="face-corner bottom-right" />

                        <div className="face-outline" />

                    </div>


                    {cameraReady && (

                        <div className="camera-live">

                            <span />

                            Camera active

                        </div>

                    )}


                    {!cameraReady && (

                        <div className="camera-loading">

                            <Spinner
                                animation="border"
                                size="sm"
                            />

                            <span>
                                Starting camera...
                            </span>

                        </div>

                    )}


                    {faceDetected && !verificationComplete && (

                        <div className="face-detected">

                            <RiCheckLine />

                            Face detected

                        </div>

                    )}


                    {verificationComplete && (

                        <div className="verification-success-overlay">

                            <div>

                                <RiCheckLine />

                            </div>

                            <span>
                                Verified
                            </span>

                        </div>

                    )}

                </div>


                {/* ===============================
                    STATUS
                =============================== */}

                <div
                    className={`face-status ${verificationComplete
                            ? "success"
                            : verifying
                                ? "active"
                                : ""
                        }`}
                >

                    <div className="face-status-icon">

                        {verificationComplete ? (

                            <RiCheckLine />

                        ) : verifying ? (

                            <RiLoader4Line className="spin" />

                        ) : (

                            <RiInformationLine />

                        )}

                    </div>


                    <div>

                        <strong>

                            {verificationComplete
                                ? "Verification complete"
                                : verifying
                                    ? "Verification in progress"
                                    : "Ready to verify"}

                        </strong>


                        <span>
                            {status}
                        </span>

                    </div>

                </div>


                {/* ===============================
                    LIVENESS INSTRUCTION
                =============================== */}

                {challenge && verifying && (

                    <div className="face-challenge">

                        <RiUserLine />

                        <div>

                            <span>
                                LIVENESS CHECK
                            </span>

                            <strong>

                                {challenge === "down"

                                    ? "Nod slightly downward"

                                    : `Turn your head slightly ${challenge}`}

                            </strong>

                        </div>

                    </div>

                )}


                {/* ===============================
                    TIP
                =============================== */}

                {!verificationComplete && (

                    <div className="face-verification-tip">

                        <RiCameraLine />

                        <span>
                            Keep your face visible,
                            stay in good lighting and
                            avoid moving too quickly.
                        </span>

                    </div>

                )}

            </Modal.Body>


            <Modal.Footer>

                <Button
                    variant="light"
                    className="face-cancel-btn"
                    onClick={handleClose}
                    disabled={verifying}
                >

                    <RiCloseLine />

                    Cancel

                </Button>


                <Button
                    className="face-verify-btn"
                    onClick={verifyFace}
                    disabled={
                        loading ||
                        verifying ||
                        verificationComplete ||
                        !cameraReady
                    }
                >

                    {verifying ? (

                        <>

                            <RiLoader4Line className="spin" />

                            Verifying...

                        </>

                    ) : verificationComplete ? (

                        <>

                            <RiCheckLine />

                            Verified

                        </>

                    ) : (

                        <>

                            Verify My Face

                            <RiArrowRightLine />

                        </>

                    )}

                </Button>

            </Modal.Footer>

        </Modal>
    );
};


export default FaceVerificationModal;

