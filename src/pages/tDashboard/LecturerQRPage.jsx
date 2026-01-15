import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Button, Spinner, ProgressBar, Alert } from "react-bootstrap";
import QRCode from "react-qr-code";
import { useParams } from "react-router-dom";

const LecturerQRPage = () => {
    const refreshIntervalRef = useRef(null);
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
    const fullscreenWindowRef = useRef(null);
    const token = localStorage.getItem("token");
    // ADD THESE STATE VARIABLES AT THE TOP
    const [lecturerLocation, setLecturerLocation] = useState(null);
    const [locationReady, setLocationReady] = useState(false); // stable GPS
    const lecturerWatchIdRef = useRef(null);

    // ==================== START GPS WATCH ==================== //
    const startLecturerGps = () => {
        if (!navigator.geolocation) {
            setError("Geolocation not supported by your browser");
            return;
        }

        // clear any previous watch
        if (lecturerWatchIdRef.current) {
            navigator.geolocation.clearWatch(lecturerWatchIdRef.current);
        }

        lecturerWatchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                console.log("[LECTURER GPS]", { latitude, longitude, accuracy });

                // save current reading
                setLecturerLocation({ lat: latitude, lng: longitude, accuracy });

                // wait until GPS is reasonably accurate
                if (accuracy <= 50 && !locationReady) {
                    setLocationReady(true);
                    console.log("Lecturer GPS stable ✅");
                }
            },
            (err) => {
                console.error("Lecturer GPS error:", err);
                setError("GPS permission is required for accurate session location.");
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
    };

    // ==================== STOP GPS WATCH ==================== //
    const stopLecturerGps = () => {
        if (lecturerWatchIdRef.current) {
            navigator.geolocation.clearWatch(lecturerWatchIdRef.current);
            lecturerWatchIdRef.current = null;
        }
    };

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

    useEffect(() => {
        startLecturerGps();
        return () => stopLecturerGps();
    }, []);

    

    const handleAutoEnd = async () => {
        try {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
            }

            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/sessions/${sessionId}/end`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setEndMsg(res.data.msg || "Session auto-ended due to expiry.");
            setEnded(true);
            setExpired(true);
            setSessionId(null);
        } catch (err) {
            console.error("Auto end error:", err.message);
        }
    };

    const handleCreateSession = async () => {
        if (!courseId) return alert("Course ID missing.");

        setLoading(true);
        setError("");

        try {
            // Make sure GPS is ready
            if (!locationReady || !lecturerLocation) {
                setError("Waiting for GPS to stabilize...");
                setLoading(false);
                return;
            }

            const { lat, lng, accuracy } = lecturerLocation;
            const token = localStorage.getItem("token");

            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/sessions/${courseId}/create`,
                {
                    type: "QR",
                    location: { lat, lng, accuracy },
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const { token: sessionToken, expiresAt, sessionId } = res.data;

            const qrUrl = `${import.meta.env.VITE_FRONTEND_URL}/student/scan/${sessionToken}`;
            setQrData(qrUrl);
            setExpiresAt(expiresAt);
            setSessionId(sessionId);
            setExpired(false);
            setEnded(false);
            setEndMsg("");

            console.log("[SESSION CREATED]", { sessionId, lat, lng, accuracy });
        } catch (err) {
            console.error("[CREATE SESSION ERROR]", err.response?.data || err.message);
            setError(err.response?.data?.msg || "Failed to create session.");
        } finally {
            setLoading(false);
        }
    };



    const sendQrToFullscreen = () => {
        const win = fullscreenWindowRef.current;
        if (!win || win.closed || !qrRef.current) return;

        const svg = qrRef.current.querySelector("svg");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: "image/svg+xml" });
        const url = URL.createObjectURL(svgBlob);

        win.postMessage(
            { type: "QR_UPDATE", payload: url },
            "*"
        );
    };

    useEffect(() => {
        if (!sessionId || expired || ended) return;

        // ✅ CLEAR BEFORE SETTING
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
        }

        refreshIntervalRef.current = setInterval(async () => {
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

        return () => {
            clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = null;
        };
    }, [sessionId, expired, ended]);


    useEffect(() => {
        sendQrToFullscreen();
    }, [qrData]);

    useEffect(() => {
        if (ended && fullscreenWindowRef.current) {
            fullscreenWindowRef.current.close();
        }
    }, [ended]);




    const handleEndSession = async () => {
        if (!sessionId) return alert("No active session.");

        try {
            setEnding(true);

            stopLecturerGps(); // 🛑 stop GPS tracking
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
            }

            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/sessions/${sessionId}/end`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setEndMsg(res.data.msg || "Session ended successfully.");
            setEnded(true);
            setExpired(true);
            setSessionId(null);
        } catch (err) {
            setError(err.response?.data?.msg || "Failed to end session.");
        } finally {
            setEnding(false);
        }
    };



    const handleViewFullscreen = () => {
        if (!qrRef.current) return;

        if (fullscreenWindowRef.current && !fullscreenWindowRef.current.closed) {
            fullscreenWindowRef.current.focus();
            return;
        }

        const win = window.open("", "_blank", "width=700,height=700");
        fullscreenWindowRef.current = win;

        win.document.write(`
          <html>
            <head>
              <title>Attendance QR</title>
              <style>
                body {
                  margin: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  background: #ffffff;
                }
                img {
                  width: 90vmin;
                  height: 90vmin;
                  background: #ffffff;
                }
              </style>
            </head>
            <body>
              <img id="qrImg" />
              <script>
                window.addEventListener("message", (e) => {
                  if (e.data?.type === "QR_UPDATE") {
                    document.getElementById("qrImg").src = e.data.payload;
                  }
                });
              </script>
            </body>
          </html>
        `);

        win.document.close();
        sendQrToFullscreen();
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