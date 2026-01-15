import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";

// Distance between two GPS points (meters)
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

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Smooth map movement
function SmoothCenter({ position }) {
    const map = useMap();
    const prevPosition = useRef(null);

    useEffect(() => {
        if (!position) return;

        if (!prevPosition.current) {
            map.flyTo([position.lat, position.lng], 18);
            prevPosition.current = position;
            return;
        }

        const dist = getDistanceInMeters(
            prevPosition.current.lat,
            prevPosition.current.lng,
            position.lat,
            position.lng
        );

        if (dist > 1) {
            map.flyTo([position.lat, position.lng], map.getZoom(), { duration: 0.6 });
            prevPosition.current = position;
        }
    }, [position, map]);

    return null;
}

export default function AttendanceMap({ sessionLocation, onInsideChange, onLocationChange, onGpsReady }) {
    const stableCountRef = useRef(0);
    const [studentLocation, setStudentLocation] = useState(null);
    const [distance, setDistance] = useState(null);
    const [gpsReady, setGpsReady] = useState(false);

    useEffect(() => {
        if (!navigator.geolocation) {
            alert("Your device does not support GPS");
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;

                // ❌ Reject fake WiFi / IP-based locations
                if (accuracy > 300) {
                    console.warn("Ignoring low-accuracy GPS:", accuracy);
                    return;
                }

                const studentLoc = {
                    lat: latitude,
                    lng: longitude,
                    accuracy,
                };

                setStudentLocation(studentLoc);
                if (onLocationChange) onLocationChange(studentLoc);

                // Require 2 consecutive accurate readings
                stableCountRef.current += 1;

                if (stableCountRef.current >= 2 && !gpsReady) {
                    setGpsReady(true);
                    if (onGpsReady) onGpsReady(true);
                }


                if (onLocationChange) onLocationChange(studentLoc);

                const d = getDistanceInMeters(
                    latitude,
                    longitude,
                    sessionLocation.lat,
                    sessionLocation.lng
                );

                const rounded = Math.round(d);
                setDistance(rounded);

                if (onInsideChange) {
                    onInsideChange(rounded <= (sessionLocation.radius || 60));
                }
            },
            (err) => {
                console.error("GPS error:", err);
                alert("Please enable precise GPS location (not Wi-Fi or IP)");
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0, // no cached location
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [sessionLocation, onInsideChange, onLocationChange]);

    const inside =
        gpsReady && distance !== null && distance <= (sessionLocation.radius || 60);

    return (
        <div>
            <MapContainer
                center={[sessionLocation.lat, sessionLocation.lng]}
                zoom={18}
                style={{ height: "320px", width: "100%", borderRadius: "12px" }}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Move camera to real student GPS */}
                {studentLocation && <SmoothCenter position={studentLocation} />}

                {/* Lecturer marker */}
                <Marker position={[sessionLocation.lat, sessionLocation.lng]} />

                {/* Geofence */}
                <Circle
                    center={[sessionLocation.lat, sessionLocation.lng]}
                    radius={sessionLocation.radius || 60}
                    pathOptions={{
                        color: inside ? "green" : "red",
                        fillOpacity: 0.2,
                    }}
                />

                {/* Student marker */}
                {studentLocation && (
                    <Marker position={[studentLocation.lat, studentLocation.lng]} />
                )}
            </MapContainer>

            {!gpsReady && (
                <p style={{ marginTop: 10, fontWeight: 600, color: "orange" }}>
                    Waiting for accurate GPS signal…
                </p>
            )}

            {gpsReady && distance !== null && (
                <p style={{ marginTop: 10, fontWeight: 600 }}>
                    Distance to lecture: {distance} meters —{" "}
                    <span style={{ color: inside ? "green" : "red" }}>
                        {inside ? "INSIDE zone" : "OUTSIDE zone"}
                    </span>
                </p>
            )}
        </div>
    );
}