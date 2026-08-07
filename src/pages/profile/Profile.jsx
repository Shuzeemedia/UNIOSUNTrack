import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import LoadingSpinner from "../../components/Loader/LoadingSpinner";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import Cropper from "react-easy-crop";
import ReEnrollFaceModal from "../../components/ReEnrollFaceModal";

import {
  FaCamera,
  FaCheckCircle,
  FaShieldAlt,
  FaUser,
  FaEnvelope,
  FaIdCard,
  FaGraduationCap,
  FaBuilding,
  FaEdit,
  FaLock,
  FaTimes,
  FaSave,
  FaSyncAlt,
} from "react-icons/fa";

import "./profile.css";


/* =========================================================
   CROP IMAGE HELPER
========================================================= */

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

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create image blob"));
        },
        "image/jpeg",
        0.9
      );
    };

    image.onerror = reject;
  });
};


/* =========================================================
   PROFILE
========================================================= */

const Profile = () => {

  const {
    user,
    setUser,
    loadingX
  } = useContext(AuthContext);


  /* =========================
     PROFILE STATE
  ========================= */

  const [userData, setUserData] = useState(null);

  const [loading, setLoading] = useState(true);

  const [updating, setUpdating] = useState(false);


  /* =========================
     FORM STATE
  ========================= */

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [level, setLevel] = useState("");

  const [departmentName, setDepartmentName] =
    useState("");

  const [departmentId, setDepartmentId] =
    useState("");

  const [profilePic, setProfilePic] =
    useState("");


  /* =========================
     IMAGE CROPPER
  ========================= */

  const [cropImageSrc, setCropImageSrc] =
    useState(null);

  const [crop, setCrop] =
    useState({ x: 0, y: 0 });

  const [zoom, setZoom] =
    useState(1);

  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState(null);

  const [showCropper, setShowCropper] =
    useState(false);

  const [savingCrop, setSavingCrop] =
    useState(false);


  /* =========================
     MODALS
  ========================= */

  const [showPreview, setShowPreview] =
    useState(false);

  const [showReEnroll, setShowReEnroll] =
    useState(false);


  const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api";


  /* =========================================================
     AUTH CHECK
  ========================================================= */

  useEffect(() => {

    if (!loadingX && !user) {

      toast.error(
        "Session expired. Please log in again."
      );

      window.location.href = "/login";
    }

  }, [user, loadingX]);


  /* =========================================================
     NORMALIZE USER
  ========================================================= */

  const normalizeUser = (userObj) => {

    if (!userObj) return null;

    const normalized = {
      ...userObj,
      id: userObj.id || userObj._id,
    };


    if (normalized.department) {

      normalized.department = {
        ...normalized.department,
        id:
          normalized.department.id ||
          normalized.department._id,
      };

      delete normalized.department._id;
    }


    delete normalized._id;

    return normalized;
  };


  /* =========================================================
     UPDATE USER EVERYWHERE
  ========================================================= */

  const updateUserEverywhere = (newUser) => {

    if (!newUser) return;

    const normalized =
      normalizeUser(newUser);

    setUserData(normalized);

    setUser(normalized);

    localStorage.setItem(
      "user",
      JSON.stringify(normalized)
    );
  };


  /* =========================================================
     INITIALS
  ========================================================= */

  const getInitials = (fullName) => {

    if (!fullName) return "U";

    const parts =
      fullName.trim().split(/\s+/);

    if (parts.length === 1) {

      return parts[0][0].toUpperCase();
    }

    return (
      parts[0][0] +
      parts[parts.length - 1][0]
    ).toUpperCase();
  };


  /* =========================================================
     LOAD PROFILE
  ========================================================= */

  useEffect(() => {

    if (loadingX) return;

    let cancelled = false;


    const loadProfile = async () => {

      try {

        const token =
          localStorage.getItem("token");

        if (!token) return;


        const res = await axios.get(
          `${API_BASE_URL}/profile/me`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


        if (cancelled) return;


        const foundUser =
          res.data?.user ||
          res.data;


        if (!foundUser) {

          throw new Error(
            "No user data received"
          );
        }


        updateUserEverywhere(foundUser);


        setName(
          foundUser.name || ""
        );

        setEmail(
          foundUser.email || ""
        );

        setLevel(
          foundUser.level ?? ""
        );


        setDepartmentName(
          foundUser.department?.name ||
          (
            typeof foundUser.department ===
            "string"
              ? foundUser.department
              : ""
          )
        );


        setDepartmentId(
          foundUser.department?._id ||
          foundUser.department?.id ||
          foundUser.department ||
          ""
        );


        setProfilePic(
          foundUser.profileImage ||
          foundUser.profilePic ||
          foundUser.profile ||
          ""
        );

      } catch (err) {

        console.error(
          "Profile load error:",
          err
        );


        if (
          err.response?.status === 401 ||
          err.response?.status === 403
        ) {

          toast.error(
            "Session expired. Please log in again."
          );

          localStorage.removeItem("token");

          localStorage.removeItem("user");

          setTimeout(
            () =>
              (window.location.href =
                "/login"),
            1000
          );

        } else {

          toast.error(
            "Failed to load profile. Please try again."
          );
        }

      } finally {

        if (!cancelled) {
          setLoading(false);
        }
      }
    };


    loadProfile();


    return () => {
      cancelled = true;
    };

  }, [loadingX]);


  /* =========================================================
     PROFILE IMAGE CHANGE
  ========================================================= */

  const handleProfilePicChange = (e) => {

    const file =
      e.target.files?.[0];

    if (!file) return;


    if (!file.type.startsWith("image/")) {

      toast.error(
        "Please select a valid image."
      );

      return;
    }


    if (file.size > 5 * 1024 * 1024) {

      toast.error(
        "Image must be smaller than 5MB."
      );

      return;
    }


    const reader =
      new FileReader();


    reader.onloadend = () => {

      setCropImageSrc(
        reader.result
      );

      setZoom(1);

      setCrop({
        x: 0,
        y: 0
      });

      setShowCropper(true);
    };


    reader.readAsDataURL(file);

    e.target.value = "";
  };


  /* =========================================================
     UPDATE PROFILE
  ========================================================= */

  const handleUpdate = async (e) => {

    e.preventDefault();

    if (!userData) return;


    setUpdating(true);


    try {

      const token =
        localStorage.getItem("token");


      if (!token) {

        throw new Error(
          "Missing token"
        );
      }


      const payload = {};


      if (name !== userData.name) {
        payload.name = name;
      }


      if (email !== userData.email) {
        payload.email = email;
      }


      if (
        level !==
        (userData.level ?? "")
      ) {

        payload.level = level;
      }


      const currentDepartment =
        userData.department?._id ||
        userData.department?.id ||
        userData.department ||
        "";


      if (
        departmentId &&
        departmentId !== currentDepartment
      ) {

        payload.department =
          departmentId;
      }


      if (
        !Object.keys(payload).length
      ) {

        toast.info(
          "No changes detected."
        );

        setUpdating(false);

        return;
      }


      const res = await axios.put(
        `${API_BASE_URL}/profile/me`,
        payload,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );


      const updatedUser =
        res.data?.user ||
        res.data;


      if (updatedUser) {

        updateUserEverywhere(
          updatedUser
        );


        setName(
          updatedUser.name ||
          name
        );


        setEmail(
          updatedUser.email ||
          email
        );


        toast.success(
          "Profile updated successfully!"
        );
      }

    } catch (err) {

      console.error(
        "Profile update error:",
        err
      );


      toast.error(
        err.response?.data?.msg ||
        "Failed to update profile."
      );

    } finally {

      setUpdating(false);
    }
  };


  /* =========================================================
     SAVE CROPPED IMAGE
  ========================================================= */

  const handleSaveCropped = async () => {

    if (!croppedAreaPixels) return;


    try {

      setSavingCrop(true);


      const croppedBlob =
        await getCroppedImg(
          cropImageSrc,
          croppedAreaPixels
        );


      const croppedFile =
        new File(
          [croppedBlob],
          "profile.jpg",
          {
            type: "image/jpeg"
          }
        );


      const formData =
        new FormData();

      formData.append(
        "image",
        croppedFile
      );


      const token =
        localStorage.getItem("token");


      if (!token) {

        throw new Error(
          "Session expired"
        );
      }


      const res =
        await axios.post(
          `${API_BASE_URL}/profile/me/profile-pic`,
          formData,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      const newUrl =
        res.data.url;


      setProfilePic(newUrl);


      updateUserEverywhere({
        ...userData,
        profileImage: newUrl
      });


      setShowCropper(false);

      setCropImageSrc(null);


      toast.success(
        "Profile picture updated!"
      );

    } catch (err) {

      console.error(
        "Failed to upload cropped image:",
        err
      );


      toast.error(
        err.response?.data?.msg ||
        "Failed to update profile picture."
      );

    } finally {

      setSavingCrop(false);
    }
  };


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading || loadingX) {

    return <LoadingSpinner />;
  }


  const initials =
    getInitials(
      userData?.name || ""
    );


  const hasFace =
    userData?.faceDescriptor?.length ===
    128;


  /* =========================================================
     RENDER
  ========================================================= */

  return (

    <div className="profile-container">

      <div className="profile-card">


        {/* =================================================
            PROFILE HEADER
        ================================================= */}

        <div className="profile-top">

          <div className="profile-title-area">

            <span className="profile-eyebrow">
              ACCOUNT SETTINGS
            </span>

            <h2>
              My Profile
            </h2>

            <p>
              Manage your personal and
              academic information.
            </p>

          </div>


          <div className="profile-role-badge">

            <FaShieldAlt />

            {userData?.role ||
              "User"}

          </div>

        </div>


        {/* =================================================
            AVATAR
        ================================================= */}

        <div className="profile-avatar-section">

          <div
            className="profile-avatar-wrapper"
            onClick={() =>
              profilePic &&
              setShowPreview(true)
            }
          >

            {profilePic ? (

              <img
                src={profilePic}
                alt="Profile"
                className="profile-avatar-image"
                onError={() => {

                  setProfilePic("");

                  updateUserEverywhere({
                    ...userData,
                    profileImage: ""
                  });
                }}
              />

            ) : (

              <div className="profile-initials">
                {initials}
              </div>

            )}


            <label
              className="avatar-camera"
              title="Change profile picture"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <FaCamera />

              <input
                type="file"
                accept="image/*"
                onChange={
                  handleProfilePicChange
                }
              />

            </label>

          </div>


          <div className="avatar-info">

            <h3>
              {userData?.name ||
                "User"}
            </h3>

            <p>
              {userData?.email ||
                "No email available"}
            </p>


            <label className="change-photo-btn">

              <FaEdit />

              Change Photo

              <input
                type="file"
                accept="image/*"
                onChange={
                  handleProfilePicChange
                }
              />

            </label>

          </div>

        </div>


        {/* =================================================
            PERSONAL INFORMATION
        ================================================= */}

        <div className="profile-section">

          <div className="section-heading">

            <div className="section-icon">
              <FaUser />
            </div>

            <div>
              <h4>
                Personal Information
              </h4>

              <p>
                Your basic account details
              </p>
            </div>

          </div>


          <div className="profile-grid">


            <div className="profile-field">

              <label>
                Full Name
              </label>

              <div className="field-wrapper">

                <FaUser />

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  required
                />

              </div>

            </div>


            <div className="profile-field">

              <label>
                Email Address
              </label>

              <div className="field-wrapper">

                <FaEnvelope />

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                />

              </div>

            </div>

          </div>

        </div>


        {/* =================================================
            ACADEMIC INFORMATION
        ================================================= */}

        {(userData?.role === "student" ||
          userData?.role === "teacher") && (

          <div className="profile-section">

            <div className="section-heading">

              <div className="section-icon">
                <FaGraduationCap />
              </div>

              <div>

                <h4>
                  Academic Information
                </h4>

                <p>
                  Your university information
                </p>

              </div>

            </div>


            <div className="profile-grid">


              {userData?.role ===
                "student" && (

                <>

                  <div className="profile-field">

                    <label>
                      Student ID
                    </label>

                    <div className="field-wrapper readonly">

                      <FaIdCard />

                      <input
                        type="text"
                        value={
                          userData.studentId ||
                          ""
                        }
                        readOnly
                      />

                      <FaLock className="lock-icon" />

                    </div>

                  </div>


                  <div className="profile-field">

                    <label>
                      Level
                    </label>

                    <div className="field-wrapper readonly">

                      <FaGraduationCap />

                      <input
                        type="text"
                        value={level}
                        readOnly
                      />

                      <FaLock className="lock-icon" />

                    </div>

                  </div>

                </>

              )}


              <div className="profile-field">

                <label>
                  Department
                </label>

                <div className="field-wrapper readonly">

                  <FaBuilding />

                  <input
                    type="text"
                    value={
                      departmentName
                    }
                    readOnly
                  />

                  <FaLock className="lock-icon" />

                </div>

              </div>

            </div>


            <div className="readonly-note">

              <FaLock />

              <span>
                Academic information is managed
                by the university.
              </span>

            </div>

          </div>

        )}


        {/* =================================================
            FACE SECURITY
        ================================================= */}

        {userData?.role ===
          "student" && (

          <div className="profile-section">

            <div className="section-heading">

              <div className="section-icon security">
                <FaShieldAlt />
              </div>

              <div>

                <h4>
                  Face Verification
                </h4>

                <p>
                  Manage your biometric
                  attendance identity
                </p>

              </div>

            </div>


            <div
              className={`face-security-card ${
                hasFace
                  ? "registered"
                  : "unregistered"
              }`}
            >

              <div className="face-security-icon">

                {hasFace ? (
                  <FaCheckCircle />
                ) : (
                  <FaShieldAlt />
                )}

              </div>


              <div className="face-security-content">

                <strong>

                  {hasFace
                    ? "Face profile registered"
                    : "Face profile not registered"}

                </strong>


                <p>

                  {hasFace

                    ? "Your face is registered and can be used for secure attendance verification."

                    : "Your face profile has not been registered yet."}

                </p>

              </div>


              {hasFace && (

                <button
                  type="button"
                  className="reenroll-btn"
                  onClick={() =>
                    setShowReEnroll(true)
                  }
                >

                  <FaSyncAlt />

                  Re-Enroll

                </button>

              )}

            </div>


            <div className="face-security-note">

              <FaLock />

              <span>
                Face verification helps prevent
                unauthorized attendance marking.
              </span>

            </div>

          </div>

        )}


        {/* =================================================
            UPDATE BUTTON
        ================================================= */}

        <div className="profile-actions">

          <button
            type="button"
            className="update-btn"
            onClick={handleUpdate}
            disabled={updating}
          >

            {updating ? (

              <>
                <span className="button-spinner" />
                Saving Changes...
              </>

            ) : (

              <>
                <FaSave />
                Save Changes
              </>

            )}

          </button>

        </div>


      </div>


      {/* =================================================
          IMAGE PREVIEW
      ================================================= */}

      {showPreview && profilePic && (

        <div
          className="img-preview-overlay"
          onClick={() =>
            setShowPreview(false)
          }
        >

          <button
            className="preview-close"
            onClick={() =>
              setShowPreview(false)
            }
          >
            <FaTimes />
          </button>


          <div
            className="img-preview-wrapper"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <img
              src={profilePic}
              alt="Full profile preview"
              className="img-preview-full"
            />

          </div>

        </div>

      )}


      {/* =================================================
          CROPPER
      ================================================= */}

      {showCropper && (

        <div className="cropper-container">

          <div className="cropper-box">

            <div className="cropper-header">

              <div>

                <h3>
                  Adjust Profile Picture
                </h3>

                <p>
                  Position your photo inside
                  the circle.
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  setShowCropper(false)
                }
              >
                <FaTimes />
              </button>

            </div>


            <div className="cropper-area">

              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(
                  croppedArea,
                  croppedPixels
                ) =>
                  setCroppedAreaPixels(
                    croppedPixels
                  )
                }
              />

            </div>


            <div className="zoom-control">

              <span>
                Zoom
              </span>

              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) =>
                  setZoom(
                    Number(e.target.value)
                  )
                }
              />

            </div>


            <div className="cropper-buttons">

              <button
                className="cancel-crop-btn"
                onClick={() => {
                  setShowCropper(false);
                  setCropImageSrc(null);
                }}
                disabled={savingCrop}
              >

                <FaTimes />

                Cancel

              </button>


              <button
                className="save-crop-btn"
                onClick={handleSaveCropped}
                disabled={savingCrop}
              >

                {savingCrop ? (

                  <>
                    <span className="button-spinner" />
                    Saving...
                  </>

                ) : (

                  <>
                    <FaCheckCircle />
                    Save Photo
                  </>

                )}

              </button>

            </div>

          </div>

        </div>

      )}


      {/* =================================================
          RE-ENROLL MODAL
      ================================================= */}

      {showReEnroll && (

        <ReEnrollFaceModal
          onClose={() =>
            setShowReEnroll(false)
          }
        />

      )}

    </div>
  );
};


export default Profile;
