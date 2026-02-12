// FaceVerificationModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import * as faceapi from "face-api.js";
import API from "../api/api";
import { toast } from "react-toastify";

const FaceVerificationModal = ({ show, onClose, user, onVerified }) => {
    const videoRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("Initializing camera...");
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        if (!show) return;

        const loadModels = async () => {
            const MODEL_URL = "/models";
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        };

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                videoRef.current.srcObject = stream;
                await new Promise((res) => (videoRef.current.onloadedmetadata = res));
                await videoRef.current.play();
                setLoading(false);
            } catch (err) {
                console.error(err);
                toast.error("Camera access denied");
                onClose();
            }
        };

        loadModels().then(startCamera);

        return () => {
            const stream = videoRef.current?.srcObject;
            if (stream) stream.getTracks().forEach((t) => t.stop());
        };
    }, [show, onClose]);

    const verifyFace = async () => {
        if (!user?.faceDescriptor || user.faceDescriptor.length !== 128) {
            toast.error("No face enrolled for verification!");
            return;
        }

        if (verifying) return;
        setVerifying(true);
        setStatus("Detecting face...");

        const video = videoRef.current;
        const storedDescriptor = new Float32Array(user.faceDescriptor);
        const faceMatcher = new faceapi.FaceMatcher(
            [new faceapi.LabeledFaceDescriptors(user.id, [storedDescriptor])],
            0.45
        );

        let recognized = false;
        let baseNoseX = null;
        let baseNoseY = null;
        let headMoveFrames = 0;
        const TIMEOUT = 20000;
        const startTime = Date.now();

        const directions = ["left", "right", "up", "down"];
        const targetDirection = directions[Math.floor(Math.random() * directions.length)];

        const detectLoop = async () => {
            if (!video || recognized || Date.now() - startTime > TIMEOUT) {
                if (!recognized) {
                    setStatus("Face not recognized or liveness failed");
                    toast.error("Face verification failed");
                }
                setVerifying(false);
                return;
            }

            const detection = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                setStatus("No face detected...");
                return requestAnimationFrame(detectLoop);
            }

            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

            if (bestMatch.label === user.id) {
                const nose = detection.landmarks.getNose();
                const noseX = nose[3].x;
                const noseY = nose[3].y;

                if (baseNoseX === null) baseNoseX = noseX;
                if (baseNoseY === null) baseNoseY = noseY;

                const thresholdX = video.videoWidth / 20;
                const thresholdY = video.videoHeight / 25;

                let movedCorrectDirection = false;

                switch (targetDirection) {
                    case "left":
                        movedCorrectDirection = noseX < baseNoseX - thresholdX;
                        break;
                    case "right":
                        movedCorrectDirection = noseX > baseNoseX + thresholdX;
                        break;
                    case "up":
                        movedCorrectDirection = noseY < baseNoseY - thresholdY;
                        break;
                    case "down":
                        movedCorrectDirection = noseY > baseNoseY + thresholdY;
                        break;
                }

                if (movedCorrectDirection) headMoveFrames++;
                else headMoveFrames = 0;

                if (headMoveFrames >= 3) {
                    recognized = true;
                    setStatus("Head movement detected. Face verified!");
                    toast.success("Face verified successfully");

                    try {
                        await API.post("/auth/verify-face", {
                            faceDescriptor: Array.from(detection.descriptor),
                        });
                        onVerified();
                    } catch {
                        toast.error("Face verification failed on server!");
                    }

                    setVerifying(false);
                    return;
                } else {
                    setStatus(`Please move your head slightly ${targetDirection}...`);
                }
            } else {
                setStatus("Face does not match. Try again...");
            }

            requestAnimationFrame(detectLoop);
        };

        detectLoop();
    };

    return (
        <Modal show={show} onHide={onClose} centered backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title>Verify Your Face</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center">
                <video ref={videoRef} autoPlay muted playsInline className="login-face-video" />
                <p className="mt-2">{status}</p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose} disabled={loading || verifying}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={verifyFace} disabled={loading || verifying}>
                    {verifying ? <Spinner animation="border" size="sm" /> : "Verify"}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default FaceVerificationModal;
