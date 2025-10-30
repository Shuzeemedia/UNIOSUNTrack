import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api"; // ✅ use global offline-aware Axios
import { Spinner, Alert, ProgressBar } from "react-bootstrap";
import { Html5Qrcode } from "html5-qrcode";

const StudentScanPage = () => {
    const { sessionToken } = useParams(); 
    const [sessionInfo, setSessionInfo] = useState(null);
    const [status, setStatus] = useState("loading"); // loading | valid | expired | error | marked | no-camera
    const [message, setMessage] = useState("");
    const [timeLeft, setTimeLeft] = useState(0);
    const [nextQRRefresh, setNextQRRefresh] = useState(0);
    const navigate = useNavigate();
    const html5QrCodeRef = useRef(null);

    useEffect(() => {
        fetchSessionInfo();
        return () => stopScanner();
    }, []);

    const fetchSessionInfo = async () => {
        try {
            const res = await api.get(`/sessions/${sessionToken}`);
            const data = res.data.session;

            setSessionInfo(data);
            if (!data || data.expired) {
                setStatus("expired");
                setMessage("This session has expired. Ask your lecturer for a new QR.");
            } else {
                setStatus("valid");
                startCountdown(data.expiresAt);
                startRefreshCountdown();
            }
        } catch (err) {
            if (err.isOffline) {
                setStatus("error");
                setMessage("You are offline. Cannot fetch session info.");
            } else {
                setStatus("error");
                setMessage(err.response?.data?.msg || "Invalid or expired session.");
            }
        }
    };

    const startCountdown = (expiresAt) => {
        const expiry = new Date(expiresAt).getTime();
        const timer = setInterval(() => {
            const diff = expiry - Date.now();
            if (diff <= 0) {
                setStatus("expired");
                setMessage("Session expired. Ask lecturer for a new QR.");
                clearInterval(timer);
                stopScanner();
            } else {
                setTimeLeft(Math.ceil(diff / 1000));
            }
        }, 1000);
    };

    const startRefreshCountdown = () => {
        setNextQRRefresh(10);
        const interval = setInterval(() => {
            setNextQRRefresh((prev) => (prev <= 1 ? 10 : prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    };

    useEffect(() => {
        if (status === "valid" && !html5QrCodeRef.current) startScanner();
    }, [status]);

    const startScanner = async () => {
        try {
            const cameras = await Html5Qrcode.getCameras();
            if (!cameras || cameras.length === 0) {
                setStatus("error");
                setMessage(
                    "No camera detected on this device. Please use a device with a webcam or mobile phone."
                );
                return;
            }

            const html5QrCode = new Html5Qrcode("reader");
            html5QrCodeRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                async (decodedText) => {
                    if (decodedText) {
                        stopScanner();
                        await markAttendance(decodedText);
                    }
                },
                () => {}
            );
        } catch (err) {
            setStatus("error");
            setMessage("Unable to start camera. Check permissions or device webcam.");
        }
    };

    const stopScanner = async () => {
        const html5QrCode = html5QrCodeRef.current;
        if (html5QrCode && html5QrCode.isScanning) {
            try {
                await html5QrCode.stop();
                await html5QrCode.clear();
            } catch {}
        }
        html5QrCodeRef.current = null;
    };

    const markAttendance = async (scannedToken) => {
        try {
            setStatus("loading");
            const res = await api.post(`/sessions/scan/${scannedToken}`);
            setStatus("marked");
            setMessage(res.data.msg || "Attendance marked successfully!");
        } catch (err) {
            if (err.isOffline) {
                setStatus("error");
                setMessage("You are offline. Cannot mark attendance.");
            } else {
                const backendMsg = err.response?.data?.msg || "Failed to mark attendance.";
                if (backendMsg.includes("QR expired") || backendMsg.includes("Invalid")) {
                    setStatus("expired");
                    setMessage("This QR is no longer valid — wait for the next one.");
                } else {
                    setStatus("error");
                    setMessage(backendMsg);
                }
            }
        }
    };

    return (
        <div className="student-scan-container">
            <h3>Scan Attendance QR</h3>

            {status === "loading" && (
                <>
                    <Spinner animation="border" variant="success" />
                    <p className="mt-3 text-muted">Loading session...</p>
                </>
            )}

            {status === "error" && <Alert variant="danger">{message}</Alert>}

            {status === "expired" && (
                <Alert variant="warning" className="w-75">
                    ⚠️ {message}
                </Alert>
            )}

            {status === "valid" && sessionInfo && (
                <>
                    <Alert variant="success" className="w-75">
                        <strong>Session Active:</strong> {sessionInfo?.course?.code || "Course"}
                        <br />
                        <small className="text-muted">
                            Lecturer: {sessionInfo?.teacher?.name || "Instructor"}
                        </small>
                    </Alert>

                    <div className="qr-code-container">
                        <div id="reader" style={{ width: "300px", height: "300px" }}></div>
                    </div>

                    <div className="w-75 my-3">
                        <ProgressBar
                            now={(timeLeft / 600) * 100}
                            variant={timeLeft < 60 ? "danger" : "success"}
                        />
                        <p className="text-muted mt-2">
                            Session expires in: <strong>{timeLeft}s</strong>
                        </p>
                        <p className="text-muted mt-1">
                            Next QR refresh in: <strong>{nextQRRefresh}s</strong>
                        </p>
                    </div>
                </>
            )}

            {status === "marked" && (
                <Alert variant="success" className="w-75 mt-4">
                    {message || "Attendance successfully recorded!"}
                </Alert>
            )}
        </div>
    );
};

export default StudentScanPage;


