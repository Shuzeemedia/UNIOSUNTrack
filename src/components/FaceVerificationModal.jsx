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
                setLoading(false);
            } catch (err) {
                console.error(err);
                toast.error("Camera access denied");
                onClose();
            }
        };

        loadModels().then(startCamera);

        return () => {
            // Cleanup
            const stream = videoRef.current?.srcObject;
            if (stream) stream.getTracks().forEach((t) => t.stop());
        };
    }, [show, onClose]);

    const verifyFace = async () => {
        if (!user?.faceDescriptor || user.faceDescriptor.length !== 128) {
            toast.error("No face enrolled for verification!");
            return;
        }

        setLoading(true);
        setStatus("Verifying face...");

        const storedDescriptor = new Float32Array(user.faceDescriptor);
        const faceMatcher = new faceapi.FaceMatcher(
            [new faceapi.LabeledFaceDescriptors(user.id, [storedDescriptor])],
            0.45
        );

        let recognized = false;
        let baseNoseX = null;
        let headTurned = false;
        const TIMEOUT = 20000;
        const startTime = Date.now();

        const detectLoop = async () => {
            if (recognized || Date.now() - startTime > TIMEOUT) {
                if (!recognized) {
                    toast.error("Face verification failed!");
                    setStatus("Face not recognized or liveness check failed");
                }
                setLoading(false);
                return;
            }

            const detection = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

                if (bestMatch.label === user.id) {
                    const nose = detection.landmarks.getNose();
                    const noseX = nose[3].x;

                    if (baseNoseX === null) baseNoseX = noseX;

                    if (Math.abs(noseX - baseNoseX) > 15) headTurned = true;

                    if (headTurned) {
                        recognized = true;
                        setStatus("Head movement detected. Verifying face...");

                        try {
                            await API.post("/auth/verify-face", {
                                faceDescriptor: Array.from(detection.descriptor),
                            });
                            toast.success("Face verified!");
                            onVerified(); // callback
                            return;
                        } catch {
                            toast.error("Face verification failed!");
                            recognized = false;
                            headTurned = false;
                            setStatus("Face verification failed. Try again...");
                        }
                    } else {
                        setStatus("Face detected, please turn your head slightly left or right...");
                    }
                } else {
                    setStatus("Face does not match. Try again...");
                }
            } else {
                setStatus("No face detected...");
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
                <Button variant="secondary" onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={verifyFace} disabled={loading}>
                    {loading ? <Spinner animation="border" size="sm" /> : "Verify"}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default FaceVerificationModal;
