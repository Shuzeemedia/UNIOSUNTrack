import { useEffect, useRef, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Circle,
    useMap,
} from "react-leaflet";

import {
    FaMapMarkerAlt,
    FaSatelliteDish,
    FaLocationArrow,
    FaCheckCircle,
    FaExclamationCircle,
    FaRuler,
    FaLock,
    FaCrosshairs,
    FaCompass,
} from "react-icons/fa";

import "./AttendanceMap.css";

// =====================================================
// Calculate distance between two GPS points in meters
// =====================================================
function getDistanceInMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;

    const toRad = (x) => (x * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;

    return (
        R *
        2 *
        Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    );
}

// =====================================================
// Smooth map camera movement
// =====================================================
function SmoothCenter({ position }) {
    const map = useMap();
    const prevPosition = useRef(null);

    useEffect(() => {
        if (!position) return;

        if (!prevPosition.current) {
            map.flyTo(
                [position.lat, position.lng],
                18,
                {
                    duration: 0.8,
                }
            );

            prevPosition.current = position;
            return;
        }

        const distance = getDistanceInMeters(
            prevPosition.current.lat,
            prevPosition.current.lng,
            position.lat,
            position.lng
        );

        // Ignore unrealistic GPS jumps
        if (distance > 200) return;

        if (distance > 1) {
            map.flyTo(
                [position.lat, position.lng],
                map.getZoom(),
                {
                    duration: 0.6,
                }
            );

            prevPosition.current = position;
        }
    }, [position, map]);

    return null;
}

// =====================================================
// Main Attendance Map
// =====================================================
export default function AttendanceMap({
    sessionLocation,
    onInsideChange,
    onLocationChange,
    onGpsReady,
    lecturerLocation,
    mode = "student",
}) {
    const [userLocation, setUserLocation] = useState(null);
    const [distance, setDistance] = useState(null);
    const [gpsStable, setGpsStable] = useState(false);

    const stableCountRef = useRef(0);

    const radius = sessionLocation?.radius || 60;

    // =====================================================
    // GPS WATCH
    // =====================================================
    useEffect(() => {
        if (mode === "lecturer") return;
        if (!sessionLocation) return;

        if (!navigator.geolocation) {
            alert("GPS is not supported on this device.");
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            ({ coords }) => {
                const {
                    latitude,
                    longitude,
                    accuracy,
                } = coords;

                // Ignore extremely inaccurate readings
                if (accuracy > 150) return;

                const loc = {
                    lat: latitude,
                    lng: longitude,
                    accuracy,
                };

                setUserLocation(loc);

                onLocationChange?.(loc);

                // ==========================================
                // Stable GPS detection
                // ==========================================
                if (accuracy <= 40) {
                    stableCountRef.current += 1;
                } else {
                    stableCountRef.current = 0;
                }

                if (
                    stableCountRef.current >= 3 &&
                    !gpsStable
                ) {
                    setGpsStable(true);
                    onGpsReady?.(true);
                }

                // ==========================================
                // Distance calculation
                // ==========================================
                const dist = getDistanceInMeters(
                    latitude,
                    longitude,
                    sessionLocation.lat,
                    sessionLocation.lng
                );

                setDistance(Math.round(dist));

                onInsideChange?.(dist <= radius);
            },
            (err) => {
                console.error("GPS error:", err);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 15000,
            }
        );

        return () =>
            navigator.geolocation.clearWatch(watchId);
    }, [
        mode,
        sessionLocation,
        radius,
        gpsStable,
        onInsideChange,
        onLocationChange,
        onGpsReady,
    ]);

    // =====================================================
    // Recalculate when session location changes
    // =====================================================
    useEffect(() => {
        if (!userLocation || !sessionLocation) return;

        const dist = getDistanceInMeters(
            userLocation.lat,
            userLocation.lng,
            sessionLocation.lat,
            sessionLocation.lng
        );

        setDistance(Math.round(dist));

        onInsideChange?.(dist <= radius);
    }, [
        sessionLocation,
        userLocation,
        radius,
        onInsideChange,
    ]);

    // =====================================================
    // Reset GPS stability when session changes
    // =====================================================
    useEffect(() => {
        stableCountRef.current = 0;
        setGpsStable(false);
    }, [sessionLocation]);

    // =====================================================
    // Attendance state
    // =====================================================
    const insideZone =
        gpsStable &&
        distance !== null &&
        distance <= radius;

    const gpsAccuracy = userLocation?.accuracy;

    // =====================================================
    // GPS accuracy status
    // =====================================================
    const getAccuracyStatus = (accuracy) => {
        if (accuracy == null) {
            return {
                label: "Waiting",
                className: "gps-neutral",
            };
        }

        if (accuracy <= 20) {
            return {
                label: "Excellent",
                className: "gps-good",
            };
        }

        if (accuracy <= 40) {
            return {
                label: "Good",
                className: "gps-good",
            };
        }

        if (accuracy <= 100) {
            return {
                label: "Fair",
                className: "gps-warning",
            };
        }

        return {
            label: "Poor",
            className: "gps-danger",
        };
    };

    const accuracyStatus = getAccuracyStatus(gpsAccuracy);

    // =====================================================
    // Missing location
    // =====================================================
    if (!sessionLocation) {
        return (
            <div className="attendance-map-empty">

                <div className="attendance-map-empty-icon">
                    <FaMapMarkerAlt />
                </div>

                <h4>Location unavailable</h4>

                <p>
                    The attendance session location is
                    not available yet.
                </p>

            </div>
        );
    }

    return (
        <div className="attendance-location-panel">

            {/* =================================================
                MAP HEADER
            ================================================= */}
            <div className="attendance-map-header">

                <div className="attendance-map-title">

                    <div className="attendance-map-icon">
                        <FaMapMarkerAlt />
                    </div>

                    <div>
                        <h4>
                            {mode === "lecturer"
                                ? "Attendance Location"
                                : "Your Attendance Location"}
                        </h4>

                        <span>
                            {mode === "lecturer"
                                ? "Students must be within this area"
                                : "Your location relative to the lecture"}
                        </span>
                    </div>

                </div>

                <div
                    className={`location-status ${mode === "lecturer"
                            ? "location-locked"
                            : insideZone
                                ? "location-inside"
                                : "location-outside"
                        }`}
                >

                    <span className="status-dot"></span>

                    {mode === "lecturer"
                        ? "LOCATION LOCKED"
                        : insideZone
                            ? "INSIDE ZONE"
                            : "OUTSIDE ZONE"}

                </div>

            </div>

            {/* =================================================
                MAP
            ================================================= */}
            <div className="attendance-map-wrapper">

                <MapContainer
                    center={[
                        sessionLocation.lat,
                        sessionLocation.lng,
                    ]}
                    zoom={18}
                    className="attendance-map"
                >

                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                    />

                    {/* Student camera follows GPS */}
                    {mode === "student" &&
                        userLocation && (
                            <SmoothCenter
                                position={userLocation}
                            />
                        )}

                    {/* Session location */}
                    <Marker
                        position={[
                            sessionLocation.lat,
                            sessionLocation.lng,
                        ]}
                    />

                    {/* Geofence */}
                    <Circle
                        center={[
                            sessionLocation.lat,
                            sessionLocation.lng,
                        ]}
                        radius={radius}
                        pathOptions={{
                            color:
                                mode === "lecturer"
                                    ? "#2563eb"
                                    : insideZone
                                        ? "#16a34a"
                                        : "#dc2626",

                            fillColor:
                                mode === "lecturer"
                                    ? "#2563eb"
                                    : insideZone
                                        ? "#16a34a"
                                        : "#dc2626",

                            fillOpacity: 0.15,

                            weight: 2,
                        }}
                    />

                    {/* Student location */}
                    {mode === "student" &&
                        userLocation && (
                            <Marker
                                position={[
                                    userLocation.lat,
                                    userLocation.lng,
                                ]}
                            />
                        )}

                </MapContainer>

                {/* Map radius badge */}
                <div className="map-radius-badge">

                    <FaCrosshairs />

                    <div>
                        <span>Attendance Radius</span>
                        <strong>{radius}m</strong>
                    </div>

                </div>

            </div>

            {/* =================================================
                LECTURER INFORMATION
            ================================================= */}
            {mode === "lecturer" && (
                <div className="location-info-grid">

                    <div className="location-info-card">

                        <div className="info-icon blue">
                            <FaCrosshairs />
                        </div>

                        <div>
                            <span>Session Radius</span>
                            <strong>{radius} meters</strong>
                        </div>

                    </div>

                    <div className="location-info-card">

                        <div className="info-icon green">
                            <FaSatelliteDish />
                        </div>

                        <div>
                            <span>GPS Accuracy</span>

                            <strong
                                className={
                                    sessionLocation.accuracy <= 30
                                        ? "text-good"
                                        : sessionLocation.accuracy <= 100
                                            ? "text-warning"
                                            : "text-danger"
                                }
                            >
                                {sessionLocation.accuracy
                                    ? `±${Math.round(
                                        sessionLocation.accuracy
                                    )}m`
                                    : "Unavailable"}
                            </strong>

                        </div>

                    </div>

                </div>
            )}

            {/* =================================================
                STUDENT INFORMATION
            ================================================= */}
            {mode === "student" && (
                <div className="student-location-section">

                    {/* Main status */}
                    <div
                        className={`attendance-status-card ${insideZone
                                ? "status-inside"
                                : "status-outside"
                            }`}
                    >

                        <div className="attendance-status-icon">

                            {insideZone ? (
                                <FaCheckCircle />
                            ) : (
                                <FaExclamationCircle />
                            )}

                        </div>

                        <div className="attendance-status-content">

                            <span>
                                Attendance Location
                            </span>

                            <strong>
                                {!gpsStable
                                    ? "Waiting for stable GPS..."
                                    : insideZone
                                        ? "You are inside the attendance zone"
                                        : "You are outside the attendance zone"}
                            </strong>

                            <small>
                                {!gpsStable
                                    ? "Keep your device still while we improve your GPS accuracy."
                                    : insideZone
                                        ? "Your location is valid. You can proceed with attendance verification."
                                        : `Move closer to the lecture location. You are approximately ${distance}m away.`}
                            </small>

                        </div>

                    </div>

                    {/* =================================================
                        METRICS
                    ================================================= */}
                    <div className="location-info-grid">

                        {/* Distance */}
                        <div className="location-info-card">

                            <div className="info-icon purple">
                                <FaRuler />
                            </div>

                            <div>
                                <span>Distance</span>

                                <strong>
                                    {distance !== null
                                        ? `${distance}m`
                                        : "--"}
                                </strong>
                            </div>

                        </div>

                        {/* GPS */}
                        <div className="location-info-card">

                            <div className="info-icon orange">
                                <FaSatelliteDish />
                            </div>

                            <div>

                                <span>GPS Accuracy</span>

                                <strong
                                    className={
                                        accuracyStatus.className
                                    }
                                >
                                    {gpsAccuracy
                                        ? `±${Math.round(
                                            gpsAccuracy
                                        )}m`
                                        : "Waiting"}
                                </strong>

                                <small
                                    className={
                                        accuracyStatus.className
                                    }
                                >
                                    {accuracyStatus.label}
                                </small>

                            </div>

                        </div>

                    </div>

                    {/* =================================================
                        GPS STABILITY
                    ================================================= */}
                    <div className="gps-stability">

                        <div
                            className={`stability-indicator ${gpsStable
                                    ? "stable"
                                    : "searching"
                                }`}
                        >
                            {gpsStable ? (
                                <FaLocationArrow />
                            ) : (
                                <FaCompass />
                            )}
                        </div>

                        <div>

                            <strong>
                                {gpsStable
                                    ? "GPS signal stable"
                                    : "Finding your location"}
                            </strong>

                            <p>
                                {gpsStable
                                    ? "Your location is accurate enough for attendance verification."
                                    : "Keep your device still and allow location access."}
                            </p>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}