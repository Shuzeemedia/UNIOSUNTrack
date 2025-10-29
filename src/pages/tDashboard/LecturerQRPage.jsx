import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Button, Spinner, ProgressBar, Alert } from "react-bootstrap";
import QRCode from "react-qr-code";
import { useParams } from "react-router-dom";

const LecturerQRPage = () => {
    const { courseId } = useParams();
    const [qrData, setQrData] = useState(null);
    const [expiresAt, setExpiresAt] = useState(null);
    const [loading, setLoading] = useState(false);
    const [expired, setExpired] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [sessionId, setSessionId] = useState(null);
    const [ending, setEnding] = useState(false);
    const [ended, setEnded] = useState(false);
    const [endMsg, setEndMsg] = useState("");
    const [restoring, setRestoring] = useState(true);
    const [error, setError] = useState("");
    const qrRef = useRef(null);

    // Restore active session on mount
    useEffect(() => {
        const restoreActiveSession = async () => {
            if (!courseId) return setRestoring(false);
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(
                    `${import.meta.env.VITE_API_URL}/sessions/active/${courseId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                if (!res.data.active) {
                    setRestoring(false);
                    return;
                }

                const { session } = res.data;
                const qrUrl = `${import.meta.env.VITE_FRONTEND_URL}/student/scan/${session.token}`;
                setQrData(qrUrl);
                setExpiresAt(session.expiresAt);
                setExpired(false);
                setEnded(false);
                setSessionId(session._id);
                setEndMsg("Restored active session successfully.");
            } catch {
                setError("No active session found. You can start a new one.");
                setQrData(null);
                setExpired(false);
                setEnded(false);
            } finally {
                setRestoring(false);
            }
        };

        restoreActiveSession();
    }, [courseId]);

    // Countdown timer
    useEffect(() => {
        if (!expiresAt || ended) return;
        const timer = setInterval(() => {
            const diff = new Date(expiresAt).getTime() - Date.now();
            if (diff <= 0) {
                clearInterval(timer);
                setExpired(true);
                setTimeLeft(0);
                if (sessionId && !ended) handleAutoEnd();
            } else {
                setTimeLeft(Math.ceil(diff / 1000));
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [expiresAt, sessionId, ended]);

    const handleAutoEnd = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/sessions/${sessionId}/end`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setEndMsg(res.data.msg || "Session auto-ended due to expiry.");
            setEnded(true);
        } catch (err) {
            console.error("Auto end error:", err.message);
        }
    };

    const handleCreateSession = async () => {
        if (!courseId) return alert("Course ID missing.");
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/sessions/${courseId}/create`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const { token: sessionToken, expiresAt } = res.data;
            const qrUrl = `${import.meta.env.VITE_FRONTEND_URL}/student/scan/${sessionToken}`;
            setQrData(qrUrl);
            setExpiresAt(expiresAt);
            setExpired(false);
            setEnded(false);
            setEndMsg("");

            const sessionRes = await axios.get(
                `${import.meta.env.VITE_API_URL}/sessions/${sessionToken}`
            );
            setSessionId(sessionRes.data.session.id);
        } catch (err) {
            setError(err.response?.data?.msg || "Failed to create session.");
        } finally {
            setLoading(false);
        }
    };

    // Auto-refresh QR token every 10s
    useEffect(() => {
        if (!sessionId || expired || ended) return;
        const interval = setInterval(async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.post(
                    `${import.meta.env.VITE_API_URL}/sessions/${sessionId}/refresh`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const { token: newToken } = res.data;
                const newQrUrl = `${import.meta.env.VITE_FRONTEND_URL}/student/scan/${newToken}`;
                setQrData(newQrUrl);
            } catch (err) {
                console.error("QR auto-refresh failed:", err.message);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [sessionId, expired, ended]);

    const handleEndSession = async () => {
        if (!sessionId) return alert("No active session.");
        try {
            setEnding(true);
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/sessions/${sessionId}/end`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setEndMsg(res.data.msg || "Session ended successfully.");
            setEnded(true);
            setExpired(true);
        } catch (err) {
            setError(err.response?.data?.msg || "Failed to end session.");
        } finally {
            setEnding(false);
        }
    };

    const handleViewFullscreen = () => {
        if (!qrRef.current) return;
        const svg = qrRef.current.querySelector("svg");
        if (!svg) return alert("QR not found yet.");

        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const svgUrl = URL.createObjectURL(svgBlob);

        const newWindow = window.open("", "_blank", "width=800,height=600");
        newWindow.document.write(`
      <html>
        <head><title>Attendance QR</title></head>
        <body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f9fafb">
          <img src="${svgUrl}" alt="QR Code" style="width:350px;height:350px" />
        </body>
      </html>
    `);
    };

    const handleCopyLink = async () => {
        if (!qrData) return;
        await navigator.clipboard.writeText(qrData);
        alert("QR link copied!");
    };

    if (restoring)
        return (
            <div className="text-center py-5">
                <Spinner animation="border" /> <p>Restoring active session...</p>
            </div>
        );

    return (
        <div className="qr-section container py-4 text-center">
            <h3 className="qr-title mb-3 fw-bold">Start Class Session</h3>

            {error && <Alert variant="danger">{error}</Alert>}

            {!qrData && (
                <Button onClick={handleCreateSession} disabled={loading || !courseId}>
                    {loading ? (
                        <>
                            <Spinner animation="border" size="sm" /> Generating QR...
                        </>
                    ) : (
                        "Generate Attendance QR"
                    )}
                </Button>
            )}

            {qrData && (
                <div className="qr-wrapper mt-4">
                    <h5 className={`qr-status ${expired ? "expired" : "active"}`}>
                        {expired ? "QR Code Expired" : "QR Code Active"}
                    </h5>

                    <div className="qr-code-container mt-3" ref={qrRef}>
                        <QRCode value={qrData} size={220} />
                    </div>

                    {!expired && (
                        <>
                            <p className="qr-countdown mt-2">
                                Expires in: <strong>{timeLeft}s</strong>
                            </p>
                            <ProgressBar
                                now={(timeLeft / 600) * 100}
                                variant="success"
                                style={{ height: "6px", maxWidth: "300px", margin: "auto" }}
                            />
                        </>
                    )}

                    <p className="qr-expiration mt-2">
                        Expires at: <strong>{new Date(expiresAt).toLocaleTimeString()}</strong>
                    </p>

                    <div className="qr-controls mt-3 d-flex justify-content-center gap-2 flex-wrap">
                        <Button variant="outline-success" onClick={handleViewFullscreen}>
                            View Fullscreen
                        </Button>
                        <Button variant="outline-secondary" onClick={handleCopyLink}>
                            Copy QR Link
                        </Button>
                        {!expired && (
                            <Button
                                variant="outline-danger"
                                onClick={handleEndSession}
                                disabled={ending || ended}
                            >
                                {ending ? "Ending..." : ended ? "Session Ended" : "End Session"}
                            </Button>
                        )}
                    </div>

                    {endMsg && <Alert variant="info" className="mt-4">{endMsg}</Alert>}

                    {expired && !ended && (
                        <p className="text-danger fw-semibold mt-3">
                            QR expired — click “Generate QR” to start a new one.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default LecturerQRPage;
