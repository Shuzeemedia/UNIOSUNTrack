import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import Cropper from "react-easy-crop";
import ReEnrollFaceModal from "../../components/ReEnrollFaceModal"; // Import new modal

import "./profile.css";

// Helper to crop image
export const getCroppedImg = (imageSrc, croppedAreaPixels) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/jpeg");
    };
    image.onerror = (err) => reject(err);
  });
};

const Profile = () => {
  const { user, setUser, loadingX } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [profilePic, setProfilePic] = useState("");

  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [savingCrop, setSavingCrop] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [showReEnroll, setShowReEnroll] = useState(false); // ✅ New state for ReEnroll modal

  const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // Redirect if not logged in
  useEffect(() => {
    if (!loadingX && !user) {
      toast.error("Session expired. Please log in again.");
      window.location.href = "/login";
    }
  }, [user, loadingX]);

  const normalizeUser = (userObj) => {
    if (!userObj) return null;
    const normalized = { ...userObj, id: userObj.id || userObj._id };
    if (normalized.department) {
      normalized.department = {
        ...normalized.department,
        id: normalized.department.id || normalized.department._id,
      };
      delete normalized.department._id;
    }
    delete normalized._id;
    return normalized;
  };

  const updateUserEverywhere = (newUser) => {
    if (!newUser) return;
    const normalized = normalizeUser(newUser);
    setUserData(normalized);
    setUser(normalized);
    localStorage.setItem("user", JSON.stringify(normalized));
  };

  const getInitials = (fullName) => {
    if (!fullName) return "U";
    const parts = fullName.trim().split(/\s+/);
    return parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Load profile
  useEffect(() => {
    if (loadingX) return;
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get(`${API_BASE_URL}/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (cancelled) return;

        const foundUser = res.data?.user || res.data;
        if (!foundUser) throw new Error("No user data received");

        updateUserEverywhere(foundUser);
        setName(foundUser.name || "");
        setEmail(foundUser.email || "");
        setLevel(foundUser.level ?? "");
        setDepartmentName(
          foundUser.department?.name || (typeof foundUser.department === "string" ? foundUser.department : "")
        );
        setDepartmentId(foundUser.department?._id || foundUser.department || "");
        setProfilePic(foundUser.profileImage || foundUser.profilePic || foundUser.profile || "");
      } catch (err) {
        console.error("Profile load error:", err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          toast.error("Session expired. Please log in again.");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setTimeout(() => (window.location.href = "/login"), 1000);
        } else {
          toast.error("Failed to load profile. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();
    return () => (cancelled = true);
  }, [loadingX]);

  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCropImageSrc(reader.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!userData) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token");

      const payload = {};
      if (name !== userData.name) payload.name = name;
      if (email !== userData.email) payload.email = email;
      if (level !== (userData.level ?? "")) payload.level = level;
      if (departmentId && departmentId !== (userData.department?._id || userData.department || "")) {
        payload.department = departmentId;
      }

      if (!Object.keys(payload).length) {
        toast.info("No changes detected.");
        setUpdating(false);
        return;
      }

      const res = await axios.put(`${API_BASE_URL}/profile/me`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updatedUser = res.data?.user || res.data;
      if (updatedUser) {
        updateUserEverywhere(updatedUser);
        setName(updatedUser.name || name);
        setEmail(updatedUser.email || email);
        toast.success("Profile updated!");
      }
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error("Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  if (loading || loadingX) return <LoadingSpinner />;

  const initials = getInitials(userData?.name || "");

  const handleSaveCropped = async () => {
    if (!croppedAreaPixels) return;

    try {
      setSavingCrop(true);
      const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], "profile.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("image", croppedFile);

      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE_URL}/profile/me/profile-pic`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const newUrl = res.data.url;
      setProfilePic(newUrl);
      updateUserEverywhere({ ...userData, profileImage: newUrl });

      setShowCropper(false);
      toast.success("Profile picture updated!");
    } catch (err) {
      console.error("Failed to upload cropped image:", err);
      toast.error("Failed to update profile picture");
    } finally {
      setSavingCrop(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2 className="profile-title">{userData?.role?.toUpperCase() || "ACCOUNT"} SETTINGS</h2>

        <div className="profile-avatar">
          {profilePic ? (
            <img
              className="profImg"
              src={profilePic}
              alt="profile"
              onClick={() => setShowPreview(true)}
              onError={() => {
                setProfilePic("");
                updateUserEverywhere({ ...userData, profileImage: "" });
              }}
            />
          ) : (
            <div className="profile-initials">{initials}</div>
          )}
          <label className="upload-btn">
            <input type="file" accept="image/*" onChange={handleProfilePicChange} />
            Change Photo
          </label>
        </div>

        <form onSubmit={handleUpdate} className="profile-form">
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          {userData?.role === "student" && (
            <>
              <div className="form-group">
                <label>Level</label>
                <input type="text" value={level} readOnly />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input type="text" value={departmentName} readOnly />
              </div>
              <div className="form-group">
                <label>Student ID</label>
                <input type="text" value={userData.studentId || ""} readOnly />
              </div>

              {/* ✅ Re-Enroll Face Button */}
              {userData?.faceDescriptor?.length > 0 && (
                <div className="form-group">
                  <button
                    type="button"
                    className="update-btn"
                    onClick={() => setShowReEnroll(true)}
                  >
                    Re-Enroll Face
                  </button>
                </div>
              )}
            </>
          )}

          {userData?.role === "teacher" && (
            <div className="form-group">
              <label>Department</label>
              <input type="text" value={departmentName} readOnly />
            </div>
          )}

          <button type="submit" className="update-btn" disabled={updating}>
            {updating ? "Updating..." : "Update Profile"}
          </button>
        </form>
      </div>

      {/* Preview Overlay */}
      {showPreview && (
        <div className="img-preview-overlay" onClick={() => setShowPreview(false)}>
          <div className="img-preview-wrapper" onClick={(e) => e.stopPropagation()}>
            <img src={profilePic} alt="Full Preview" className="img-preview-full" />
          </div>
        </div>
      )}

      {/* Cropper Modal */}
      {showCropper && (
        <div className="cropper-container">
          <div className="cropper-box">
            <Cropper
              image={cropImageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(croppedArea, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
            />
            <div className="cropper-buttons">
              <button
                className="save-crop-btn"
                onClick={handleSaveCropped}
                disabled={savingCrop}
              >
                {savingCrop ? "Saving..." : "Save"}
              </button>

              <button className="cancel-crop-btn" onClick={() => setShowCropper(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Re-Enroll Face Modal */}
      {showReEnroll && <ReEnrollFaceModal onClose={() => setShowReEnroll(false)} />}
    </div>
  );
};

export default Profile;
