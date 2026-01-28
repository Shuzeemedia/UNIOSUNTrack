import * as faceapi from "face-api.js";
import API from "../api/api";
import { toast } from "react-toastify";

// Pass the student user object
export const verifyStudentFace = async (user) => {
  return new Promise(async (resolve, reject) => {
    if (!user?.faceDescriptor || user.faceDescriptor.length !== 128) {
      toast.error("No face enrolled! Cannot verify.");
      return resolve(false);
    }

    // Load models if not loaded
    const MODEL_URL = "/models";
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

    // Create video element
    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    document.body.appendChild(video);
    
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;

      await new Promise((res) => (video.onloadedmetadata = res));

      const storedDescriptor = new Float32Array(user.faceDescriptor);
      const faceMatcher = new faceapi.FaceMatcher(
        [new faceapi.LabeledFaceDescriptors(user.id, [storedDescriptor])],
        0.45
      );

      let recognized = false;
      let baseNoseX = null;
      let headTurned = false;
      const startTime = Date.now();
      const TIMEOUT = 20000;

      const detectLoop = async () => {
        if (recognized || Date.now() - startTime > TIMEOUT) {
          if (!recognized) toast.error("Face verification failed!");
          cleanup();
          return resolve(recognized);
        }

        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection && detection.descriptor.length === storedDescriptor.length) {
          const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
          if (bestMatch.label === user.id) {
            const nose = detection.landmarks.getNose();
            const noseX = nose[3].x;

            if (baseNoseX === null) baseNoseX = noseX;
            if (Math.abs(noseX - baseNoseX) > 15) headTurned = true;

            if (headTurned) {
              recognized = true;
              try {
                await API.post("/auth/verify-face", {
                  faceDescriptor: Array.from(detection.descriptor),
                });
                toast.success("Face verified!");
              } catch (err) {
                toast.error("Face verification failed!");
                recognized = false;
                headTurned = false;
              }
            }
          }
        }

        requestAnimationFrame(detectLoop);
      };

      detectLoop();
    } catch (err) {
      console.error(err);
      toast.error("Face verification error!");
      cleanup();
      return resolve(false);
    }

    const cleanup = () => {
      if (video && video.srcObject) video.srcObject.getTracks().forEach((t) => t.stop());
      if (video) video.remove();
    };
  });
};
