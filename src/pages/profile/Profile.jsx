import React, { useEffect, useState, useContext } from "react";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import API from "../../api/api"; // ✅ use your configured axios instance
import "./profile.css";

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
  const [showPreview, setShowImageModal] = useState(false);

  const extractUser = (resData) => resData?.user || resData || null;

  const updateUserEverywhere = (newUser) => {
    if (!newUser) return;
    setUserData(newUser);
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const getInitials = (fullName) => {
    if (!fullName) return "U";
    const parts = fullName.trim().split(/\s+/);
    return parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Load profile when AuthContext is ready
  useEffect(() => {
    if (loadingX) return;

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const res = await API.get("/profile/me");

        if (cancelled) return;

        const foundUser = extractUser(res.data);
        if (!foundUser) throw new Error("No user data received");

        updateUserEverywhere(foundUser);
        setName(foundUser.name || "");
        setEmail(foundUser.email || "");
        setLevel(foundUser.level ?? "");
        setDepartmentName(
          foundUser.department?.name ||
            (typeof foundUser.department === "string"
              ? foundUser.department
              : "")
        );
        setDepartmentId(
          foundUser.department?._id || foundUser.department || ""
        );
        setProfilePic(
          foundUser.profileImage ||
            foundUser.profilePic ||
            foundUser.profile ||
            ""
        );
      } catch (err) {
        console.error("❌ Profile load error:", err.response?.data || err.message);
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

    return () => {
      cancelled = true;
    };
  }, [loadingX]);

  // Handle profile picture upload
  const handleProfilePicChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setProfilePic("");
      updateUserEverywhere({ ...userData, profileImage: "" });
      toast.info("Profile picture cleared.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await API.post("/profile/me/profile-pic", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const userFromRes = extractUser(res.data);
      const returnedUrl =
        res.data.url ||
        userFromRes?.profileImage ||
        userFromRes?.profilePic ||
        "";

      if (returnedUrl) {
        setProfilePic(returnedUrl);
        updateUserEverywhere({
          ...userData,
          ...userFromRes,
          profileImage: returnedUrl,
        });
        toast.success("Profile picture updated!");
      } else {
        throw new Error("No image URL returned from server");
      }
    } catch (err) {
      console.error("Profile upload error:", err);
      toast.error("Failed to upload profile picture");
    }
  };

  // Handle update info
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!userData) return;

    setUpdating(true);
    try {
      const payload = {};
      if (name !== userData.name) payload.name = name;
      if (email !== userData.email) payload.email = email;
      if (level !== (userData.level ?? "")) payload.level = level;
      if (
        departmentId &&
        departmentId !==
          (userData.department?._id || userData.department || "")
      ) {
        payload.department = departmentId;
      }

      if (!Object.keys(payload).length) {
        toast.info("No changes detected.");
        setUpdating(false);
        return;
      }

      const res = await API.put("/profile/me", payload);
      const updatedUser = extractUser(res.data);
      if (updatedUser) {
        updateUserEverywhere(updatedUser);
        setName(updatedUser.name || name);
        setEmail(updatedUser.email || email);
        toast.success("Profile updated!");
      }
    } catch (err) {
      console.error("Profile update error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error("Session expired. Please log in again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setTimeout(() => (window.location.href = "/login"), 1000);
      } else {
        toast.error("Failed to update profile");
      }
    } finally {
      setUpdating(false);
    }
  };

  if (loading || loadingX) return <LoadingSpinner />;

  const initials = getInitials(userData?.name || "");

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2 className="profile-title">
          {userData?.role ? userData.role.toUpperCase() : "ACCOUNT"} SETTINGS
        </h2>

        <div className="profile-avatar">
          {profilePic ? (
            <img
              className="profImg"
              src={profilePic}
              alt="profile"
              onClick={() => setShowImageModal(true)}
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
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
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

      {/* Image Preview Modal */}
      {showPreview && (
        <div
          className="img-preview-overlay"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="img-preview-wrapper"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={profilePic} alt="Full Preview" className="img-preview-full" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
