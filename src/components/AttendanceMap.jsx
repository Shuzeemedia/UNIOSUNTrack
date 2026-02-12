import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";

// Calculate distance between two GPS points in meters
function getDistanceInMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = x => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Smooth map camera movement
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

        const distance = getDistanceInMeters(
            prevPosition.current.lat,
            prevPosition.current.lng,
            position.lat,
            position.lng
        );

        if (distance > 200) return; // ignore jumps

        if (distance > 1) {
            map.flyTo([position.lat, position.lng], map.getZoom(), { duration: 0.6 });
            prevPosition.current = position;
        }
    }, [position, map]);

    return null;
}

// Main Attendance Map Component
export default function AttendanceMap({
    sessionLocation, // {lat, lng, radius}
    onInsideChange,
    onLocationChange,
    onGpsReady,
    lecturerLocation,
    mode = "student"
}) {
    const [userLocation, setUserLocation] = useState(null);
    const [distance, setDistance] = useState(null);
    const [gpsStable, setGpsStable] = useState(false);
    const stableCountRef = useRef(0);

    useEffect(() => {
        // LECTURER MODE → NO GPS WATCHING
        if (mode === "lecturer") return;

        if (!navigator.geolocation) {
            alert("GPS not supported on this device.");
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            ({ coords }) => {
                const { latitude, longitude, accuracy } = coords;

                if (accuracy > 150) return;

                const loc = { lat: latitude, lng: longitude, accuracy };
                setUserLocation(loc);
                onLocationChange?.(loc);

                // Stable GPS detection
                if (accuracy <= 40) stableCountRef.current += 1;
                else stableCountRef.current = 0;

                if (stableCountRef.current >= 3 && !gpsStable) {
                    setGpsStable(true);
                    onGpsReady?.(true);
                }

                const dist = getDistanceInMeters(
                    latitude,
                    longitude,
                    sessionLocation.lat,
                    sessionLocation.lng
                );

                setDistance(Math.round(dist));
                onInsideChange?.(
                    dist <= (sessionLocation.radius || 60)
                );
            },
            err => console.error("GPS error:", err),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [mode, sessionLocation]);


    useEffect(() => {
        if (!userLocation || !sessionLocation) return;

        const dist = getDistanceInMeters(
            userLocation.lat,
            userLocation.lng,
            sessionLocation.lat,
            sessionLocation.lng
        );

        setDistance(Math.round(dist));
        onInsideChange?.(dist <= (sessionLocation.radius || 60));
    }, [sessionLocation, userLocation, onInsideChange]);

    useEffect(() => {
        stableCountRef.current = 0;
        setGpsStable(false);
    }, [sessionLocation]);




    const insideZone = gpsStable && distance !== null && distance <= (sessionLocation.radius || 60);

    return (
        <div>
            <MapContainer
                center={[sessionLocation.lat, sessionLocation.lng]}
                zoom={18}
                style={{ height: "320px", width: "100%", borderRadius: "12px" }}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Camera follows user */}
                {mode === "student" && userLocation && (
                    <SmoothCenter position={userLocation} />
                )}


                {/* Lecturer marker */}
                <Marker position={[sessionLocation.lat, sessionLocation.lng]} />

                {/* Attendance geofence */}
                <Circle
                    center={[sessionLocation.lat, sessionLocation.lng]}
                    radius={sessionLocation.radius || 60}
                    pathOptions={{
                        color: mode === "lecturer" ? "#0d6efd" : insideZone ? "green" : "red",
                        fillOpacity: 0.2
                    }}
                />



                {/* User marker */}
                {mode === "student" && userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]} />
                )}

            </MapContainer>

            {mode === "lecturer" && (
                <>
                    <p style={{ marginTop: 10, fontWeight: 600 }}>
                        Session locked here • Radius: {sessionLocation.radius || 60}m
                    </p>

                    {sessionLocation.accuracy && (
                        <p
                            style={{
                                marginTop: 4,
                                fontWeight: 600,
                                color:
                                    sessionLocation.accuracy <= 30
                                        ? "green"
                                        : sessionLocation.accuracy <= 100
                                            ? "orange"
                                            : "red"
                            }}
                        >
                            GPS accuracy: ±{Math.round(sessionLocation.accuracy)}m
                        </p>
                    )}
                </>
            )}


            {mode === "student" && (
                <>
                    {!gpsStable && (
                        <p style={{ marginTop: 10, fontWeight: 600, color: "orange" }}>
                            Waiting for stable GPS signal...
                        </p>
                    )}

                    {gpsStable && distance !== null && (
                        <p style={{ marginTop: 10, fontWeight: 600 }}>
                            Distance to lecture: {distance} meters —{" "}
                            <span style={{ color: insideZone ? "green" : "red" }}>
                                {insideZone ? "INSIDE zone" : "OUTSIDE zone"}
                            </span>
                        </p>
                    )}

                    {/* Add GPS accuracy feedback */}
                    {userLocation && (
                        <p style={{ marginTop: 4, fontWeight: 600, color: userLocation.accuracy <= 40 ? "green" : userLocation.accuracy <= 150 ? "orange" : "red" }}>
                            GPS accuracy: ±{Math.round(userLocation.accuracy)}m
                        </p>
                    )}
                </>
            )}
        </div>
    );
}