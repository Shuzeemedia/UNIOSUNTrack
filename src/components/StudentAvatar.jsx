// src/components/StudentAvatar.jsx
import { useState, useEffect } from "react";

const StudentAvatar = ({ student, size = 48 }) => {
  const [imgError, setImgError] = useState(false);

  // Debug: log student object
  useEffect(() => {
    console.log(
      "[StudentAvatar] Rendering for student:",
      student?.name || student?.student?.name
    );
    console.log("[StudentAvatar] Full student object:", student);
  }, [student]);

  // Helper to safely get nested properties
  const getProp = (obj, ...props) => {
    for (let prop of props) {
      if (obj && obj[prop] !== undefined) return obj[prop];
    }
    return undefined;
  };

  // Prefer profileImage, fallback to other common fields
  const imageUrl =
    getProp(
      student,
      "profileImage",
      "profilePic",
      "profile",
      "image",
      "avatar"
    ) ||
    getProp(
      student?.student,
      "profileImage",
      "profilePic",
      "profile",
      "image",
      "avatar"
    ) ||
    "";

  // Generate initials from name or email if name missing
  const getInitials = () => {
    const fullName =
      getProp(student, "name") || getProp(student?.student, "name") || "";
    const email =
      getProp(student, "email") || getProp(student?.student, "email") || "";

    if (!fullName) return email ? email[0].toUpperCase() : "?";

    const parts = fullName.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Common style for both img and fallback div
  const commonStyle = {
    width: size,
    height: size,
    borderRadius: "50%",
    objectFit: "cover",
    backgroundColor: "#777", // fallback bg
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    color: "#fff",
    fontSize: size / 2.5,
    userSelect: "none",
  };

  // Render initials if no image or image failed
  if (!imageUrl || imgError) {
    return <div style={commonStyle}>{getInitials()}</div>;
  }

  return (
    <img
      src={imageUrl}
      alt={
        getProp(student, "name") ||
        getProp(student?.student, "name") ||
        "Student Avatar"
      }
      style={commonStyle}
      onError={() => setImgError(true)}
    />
  );
};

export default StudentAvatar;
