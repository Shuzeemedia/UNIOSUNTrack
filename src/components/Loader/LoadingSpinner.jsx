import React from "react";
import { BsLightningChargeFill } from "react-icons/bs";
import "./LoadingSpinner.css";

const LoadingSpinner = () => {
  return (
    <div className="spinner-overlay">

      <div className="loading-card">

        <div className="loader">

          <div className="spinner-ring"></div>

          <div className="spinner-center">
            <BsLightningChargeFill />
          </div>

        </div>

        <h4>Loading</h4>

        <p>Please wait a moment...</p>

      </div>

    </div>
  );
};

export default LoadingSpinner;