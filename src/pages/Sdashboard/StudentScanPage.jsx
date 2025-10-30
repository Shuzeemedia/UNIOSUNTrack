import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/api";
import { Spinner, Alert, ProgressBar } from "react-bootstrap";
import { Html5Qrcode } from "html5-qrcode";

const StudentScanPage = () => {
    const { sessionToken } = useParams();
    const [sessionInfo, setSessionInfo] = useState(null);
    const [status, setStatus] = useState("loading"); // loading | valid | expired | error | marked
    const [message, setMessage] = useState("");
    const [timeLeft, setTimeLeft] = useState(0);
    const [nextQRRefresh, setNextQRRefresh] = useState(0);
    const html5QrCodeRef = useRef(null);
    const countdownRef = useRef(null);
    const refreshRef = useRef(null);

    useEffect(() => {
        fetchSessionInfo();
        return () => stopScanner();
    }, []);

    const fetchSessionInfo = async () => {
        try {
            const res = await api.get(`/sessions/${sessionToken}`);
            const data = res.data.session;

            if (!data || data.expired) {
                setStatus("expired");
                setMessage("This session has expired. Ask your lecturer for a new QR.");
            } else {
                setSessionInfo(data);
                setStatus("valid");
                startCountdown(data.expiresAt);
                startRefreshCountdown();
            }
        } catch (err) {
            setStatus("error");
            setMessage(
                err.isOffline
                    ? "You are offline. Cannot fetch session info."
                    : err.response?.data?.msg || "Invalid or expired session."
            );
        }
    };

    const startCountdown = (expiresAt) => {
        const expiryTime = new Date(expiresAt).getTime();
        clearInterval(countdownRef.current);

        countdownRef.current = setInterval(() => {
            const diff = expiryTime - Date.now();
            if (diff <= 0) {
                setStatus("expired");
                setMessage("Session expired. Ask lecturer for a new QR.");
                clearInterval(countdownRef.current);
                stopScanner();
            } else {
                setTimeLeft(Math.ceil(diff / 1000));
            }
        }, 1000);
    };

    const startRefreshCountdown = () => {
        setNextQRRefresh(10);
        clearInterval(refreshRef.current);

        refreshRef.current = setInterval(() => {
            setNextQRRefresh((prev) => (prev <= 1 ? 10 : prev - 1));
        }, 1000);
    };

    useEffect(() => {
        if (status === "valid" && !html5QrCodeRef.current) startScanner();
    }, [status]);

    const startScanner = async () => {
        try {
            const cameras = await Html5Qrcode.getCameras();
            if (!cameras?.length) {
                setStatus("error");
                setMessage(
                    "No camera detected. Use a device with a webcam or mobile camera."
                );
                return;
            }

            const html5QrCode = new Html5Qrcode("reader");
            html5QrCodeRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: 250 },
                async (decodedText) => {
                    if (decodedText) {
                        stopScanner();
                        await markAttendance(decodedText);
                    }
                }
            );
        } catch {
            setStatus("error");
            setMessage("Unable to start camera. Check permissions or webcam.");
        }
    };

    const stopScanner = async () => {
        const html5QrCode = html5QrCodeRef.current;
        if (html5QrCode?.isScanning) {
            try {
                await html5QrCode.stop();
                await html5QrCode.clear();
            } catch { }
        }
        html5QrCodeRef.current = null;
    };

    const markAttendance = async (decodedText) => {
        try {
            setStatus("loading");
            const token = decodedText.split("/").pop();
            const res = await api.post(`/sessions/scan/${token}`);
            setStatus("marked");
            setMessage(res.data.msg || "Attendance marked successfully!");
        } catch (err) {
            const backendMsg = err.response?.data?.msg || "Failed to mark attendance.";
            if (backendMsg.includes("QR expired") || backendMsg.includes("Invalid")) {
                setStatus("expired");
                setMessage("This QR is no longer valid — wait for the next one.");
            } else {
                setStatus("error");
                setMessage(err.isOffline ? "You are offline." : backendMsg);
            }
        }
    };

    return (
        <div className="student-scan-container">
            <h3>Scan Attendance QRs</h3>

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
                        <strong>Session Active:</strong> {sessionInfo.course?.code || "Course"}
                        <br />
                        <small className="text-muted">
                            Lecturer: {sessionInfo.teacher?.name || "Instructor"}
                        </small>
                    </Alert>

                    <div className="qr-code-container">
                        <div id="reader" style={{ width: 300, height: 300 }}></div>
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
