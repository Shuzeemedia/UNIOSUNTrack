import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import API from "../api/api";
import * as faceapi from "face-api.js";

import {
  RiShieldCheckLine,
  RiUserLine,
  RiCameraLine,
  RiInformationLine,
  RiCheckLine,
  RiLoader4Line,
  RiArrowRightLine,
  RiCloseLine,
  RiLightbulbLine,
} from "react-icons/ri";

import "./reEnrollFaceModal.css";


/* =========================================================
   FACE MODELS
========================================================= */

const loadFaceModels = async () => {

  const MODEL_URL = "/models";

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
};


/* =========================================================
   COMPONENT
========================================================= */

const ReEnrollFaceModal = ({ onClose }) => {

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mountedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [enrollmentComplete, setEnrollmentComplete] = useState(false);

  const [statusMessage, setStatusMessage] = useState(
    "Preparing secure re-enrollment..."
  );


  /* =====================================================
     STOP CAMERA
  ===================================================== */

  const stopCamera = () => {

    if (streamRef.current) {

      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
  };


  /* =====================================================
     INITIALIZE
  ===================================================== */

  useEffect(() => {

    mountedRef.current = true;

    const initialize = async () => {

      try {

        setLoading(true);

        setStatusMessage(
          "Loading face recognition..."
        );

        await loadFaceModels();

        if (!mountedRef.current) return;


        setStatusMessage(
          "Requesting camera access..."
        );


        const stream =
          await navigator.mediaDevices.getUserMedia({

            video: {
              facingMode: "user",

              width: {
                ideal: 640,
              },

              height: {
                ideal: 480,
              },
            },

            audio: false,
          });


        if (!mountedRef.current) {

          stream
            .getTracks()
            .forEach((track) =>
              track.stop()
            );

          return;
        }


        streamRef.current = stream;


        if (videoRef.current) {

          videoRef.current.srcObject =
            stream;


          await new Promise((resolve) => {

            videoRef.current.onloadedmetadata =
              resolve;

          });


          await videoRef.current.play();
        }


        setCameraReady(true);
        setLoading(false);

        setStatusMessage(
          "Position your face inside the frame."
        );


      } catch (err) {

        console.error(
          "Re-enrollment initialization error:",
          err
        );

        setLoading(false);

        setStatusMessage(
          "Unable to initialize camera."
        );

        toast.error(
          "Unable to access your camera. Please allow camera permission."
        );

        stopCamera();
      }
    };


    initialize();


    return () => {

      mountedRef.current = false;

      stopCamera();

    };

  }, []);


  /* =====================================================
     CLOSE
  ===================================================== */

  const handleClose = () => {

    if (enrolling) return;

    stopCamera();

    onClose?.();
  };


  /* =====================================================
     CAPTURE & RE-ENROLL
  ===================================================== */

  const captureFace = async () => {

    if (
      loading ||
      enrolling ||
      enrollmentComplete
    ) {
      return;
    }


    if (
      !videoRef.current ||
      !cameraReady
    ) {

      toast.error(
        "Camera is not ready yet."
      );

      return;
    }


    setEnrolling(true);

    setFaceDetected(false);

    setStatusMessage(
      "Detecting your face..."
    );


    try {

      const video =
        videoRef.current;


      /* =========================================
         DETECT FACE
      ========================================= */

      const detection =
        await faceapi
          .detectSingleFace(

            video,

            new faceapi.TinyFaceDetectorOptions({
              inputSize: 224,
              scoreThreshold: 0.5,
            })

          )
          .withFaceLandmarks()
          .withFaceDescriptor();


      if (!detection) {

        toast.error(
          "No face detected. Position your face clearly inside the frame."
        );

        setStatusMessage(
          "No face detected. Try again."
        );

        setEnrolling(false);

        return;
      }


      setFaceDetected(true);


      /* =========================================
         DESCRIPTOR VALIDATION
      ========================================= */

      if (
        !detection.descriptor ||
        detection.descriptor.length !== 128
      ) {

        toast.error(
          "Unable to create a valid face profile."
        );

        setStatusMessage(
          "Face data could not be captured."
        );

        setEnrolling(false);

        return;
      }


      /* =========================================
         FACE QUALITY
      ========================================= */

      if (
        detection.detection.score < 0.7
      ) {

        toast.warning(
          "Face quality is too low. Improve your lighting and try again."
        );

        setStatusMessage(
          "Face quality is too low."
        );

        setEnrolling(false);

        return;
      }


      /* =========================================
         CAPTURE IMAGE
      ========================================= */

      setStatusMessage(
        "Creating your secure face profile..."
      );


      const canvas =
        document.createElement("canvas");


      canvas.width =
        video.videoWidth;


      canvas.height =
        video.videoHeight;


      const context =
        canvas.getContext("2d");


      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );


      const faceImage =
        canvas.toDataURL(
          "image/jpeg",
          0.9
        );


      const faceDescriptor =
        Array.from(
          detection.descriptor
        );


      /* =========================================
         GET USER
      ========================================= */

      const user =
        JSON.parse(
          localStorage.getItem("user")
        );


      const oldFaceDescriptor =
        user?.faceDescriptor || [];


      if (
        !oldFaceDescriptor.length
      ) {

        toast.error(
          "No existing face profile was found."
        );

        setStatusMessage(
          "Existing face profile not found."
        );

        setEnrolling(false);

        return;
      }


      /* =========================================
         AUTH TOKEN
      ========================================= */

      const token =
        localStorage.getItem("token");


      if (!token) {

        toast.error(
          "Your session has expired. Please login again."
        );

        setStatusMessage(
          "Session expired."
        );

        setEnrolling(false);

        return;
      }


      /* =========================================
         SEND TO SERVER
      ========================================= */

      setStatusMessage(
        "Securely updating your face profile..."
      );


      const res =
        await API.post(

          "/auth/reenroll-face",

          {
            faceImage,
            faceDescriptor,
            oldFaceDescriptor,
          },

          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      /* =========================================
         SUCCESS
      ========================================= */

      setEnrollmentComplete(true);

      setStatusMessage(
        "Face profile updated successfully."
      );

      toast.success(
        res.data?.msg ||
        "Face re-enrolled successfully!"
      );


      stopCamera();


      setTimeout(() => {

        if (mountedRef.current) {
          onClose?.();
        }

      }, 1000);


    } catch (err) {

      console.error(
        "Re-enroll face error:",
        err
      );


      const msg =
        err.response?.data?.msg;


      if (
        err.response?.status === 401
      ) {

        toast.error(
          msg ||
          "Your existing face could not be verified."
        );

        setStatusMessage(
          "Existing face verification failed."
        );

      } else if (
        err.response?.status === 409
      ) {

        toast.error(
          msg ||
          "This face is already registered to another user."
        );

        setStatusMessage(
          "Face already registered."
        );

      } else if (
        err.response?.status === 422
      ) {

        toast.warning(
          msg ||
          "Face quality is not sufficient."
        );

        setStatusMessage(
          "Face quality is too low."
        );

      } else {

        toast.error(
          msg ||
          "Face re-enrollment failed."
        );

        setStatusMessage(
          "Re-enrollment failed. Please try again."
        );
      }


      setEnrolling(false);

    }

  };


  /* =====================================================
     RENDER
  ===================================================== */

  return (

    <div
      className="reenroll-overlay"
      onClick={handleClose}
    >

      <div
        className="reenroll-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        {/* =========================================
                    HEADER
                ========================================= */}

        <div className="reenroll-header">

          <div className="reenroll-header-left">

            <div className="reenroll-header-icon">

              <RiShieldCheckLine />

            </div>


            <div>

              <span className="reenroll-eyebrow">
                SECURE BIOMETRIC UPDATE
              </span>

              <h3>
                Re-Enroll Your Face
              </h3>

            </div>

          </div>


          {!enrolling && !enrollmentComplete && (

            <button
              className="reenroll-close"
              onClick={handleClose}
              aria-label="Close"
            >

              <RiCloseLine />

            </button>

          )}

        </div>


        {/* =========================================
                    INTRO
                ========================================= */}

        {!enrollmentComplete && (

          <div className="reenroll-intro">

            <div className="reenroll-intro-icon">

              <RiUserLine />

            </div>


            <div>

              <strong>
                Update your biometric profile
              </strong>

              <p>
                Position your face clearly in
                the camera. Your existing face
                profile will be securely replaced.
              </p>

            </div>

          </div>

        )}


        {/* =========================================
                    CAMERA
                ========================================= */}

        <div className="reenroll-camera">

          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="reenroll-video"
          />


          {/* Dark overlay */}

          <div className="reenroll-camera-overlay" />


          {/* Face guide */}

          <div className="reenroll-face-guide">

            <div className="reenroll-corner top-left" />
            <div className="reenroll-corner top-right" />
            <div className="reenroll-corner bottom-left" />
            <div className="reenroll-corner bottom-right" />

            <div className="reenroll-face-outline" />

          </div>


          {/* Camera loading */}

          {!cameraReady && !enrollmentComplete && (

            <div className="reenroll-camera-loading">

              <RiLoader4Line className="spin" />

              <span>
                Starting camera...
              </span>

            </div>

          )}


          {/* Camera active */}

          {cameraReady &&
            !enrollmentComplete && (

              <div className="reenroll-camera-live">

                <span />

                Camera active

              </div>

            )}


          {/* Face detected */}

          {faceDetected &&
            !enrollmentComplete && (

              <div className="reenroll-face-detected">

                <RiCheckLine />

                Face detected

              </div>

            )}


          {/* Success */}

          {enrollmentComplete && (

            <div className="reenroll-success">

              <div className="reenroll-success-icon">

                <RiCheckLine />

              </div>

              <strong>
                Face Profile Updated
              </strong>

              <span>
                Your new biometric profile is ready.
              </span>

            </div>

          )}

        </div>


        {/* =========================================
                    STATUS
                ========================================= */}

        <div
          className={`reenroll-status ${enrollmentComplete
              ? "success"
              : enrolling
                ? "active"
                : ""
            }`}
        >

          <div className="reenroll-status-icon">

            {enrollmentComplete ? (

              <RiCheckLine />

            ) : enrolling ? (

              <RiLoader4Line className="spin" />

            ) : (

              <RiInformationLine />

            )}

          </div>


          <div>

            <strong>

              {enrollmentComplete

                ? "Re-enrollment complete"

                : enrolling
                  ? "Updating face profile"
                  : "Ready to capture"}

            </strong>


            <span>
              {statusMessage}
            </span>

          </div>

        </div>


        {/* =========================================
                    TIPS
                ========================================= */}

        {!enrollmentComplete && (

          <div className="reenroll-tips">

            <div className="reenroll-tip-title">

              <RiLightbulbLine />

              <span>
                For best results
              </span>

            </div>


            <div className="reenroll-tip-list">

              <span>
                <RiCheckLine />
                Face the camera directly
              </span>

              <span>
                <RiCheckLine />
                Use a well-lit environment
              </span>

              <span>
                <RiCheckLine />
                Remove anything covering your face
              </span>

            </div>

          </div>

        )}


        {/* =========================================
                    FOOTER
                ========================================= */}

        {!enrollmentComplete && (

          <div className="reenroll-footer">

            <button
              className="reenroll-cancel-btn"
              onClick={handleClose}
              disabled={enrolling}
            >

              <RiCloseLine />

              Cancel

            </button>


            <button
              className="reenroll-capture-btn"
              onClick={captureFace}
              disabled={
                loading ||
                enrolling ||
                !cameraReady
              }
            >

              {enrolling ? (

                <>

                  <RiLoader4Line className="spin" />

                  Updating...

                </>

              ) : (

                <>

                  <RiCameraLine />

                  Capture New Face

                  <RiArrowRightLine />

                </>

              )}

            </button>

          </div>

        )}

      </div>

    </div>
  );
};


export default ReEnrollFaceModal;