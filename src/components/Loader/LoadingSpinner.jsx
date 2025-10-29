import React from "react";
import "./LoadingSpinner.css";

const LoadingSpinner = () => {
  return (
    <div className="spinner-overlay">
      <div className="circle-loader">
        <div className="circle-container">
          <div className="circle pulse"></div>
          <div className="circle ring"></div>
        </div>
        <p className="loading-text">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
