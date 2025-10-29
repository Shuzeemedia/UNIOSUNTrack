// src/pages/Forbidden.jsx
import React from "react";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

function Forbidden() {
  const navigate = useNavigate();

  return (
    <div
      className="d-flex flex-column justify-content-center align-items-center vh-100 text-center"
    >
      <h1 className="display-3 fw-bold text-danger">403</h1>
      <h2 className="mb-3">Access Denied</h2>
      <p className="text-muted mb-4">
        You don’t have permission to view this page.
      </p>
      <Button variant="primary" onClick={() => navigate("/login")}>
        Go Back Home
      </Button>
    </div>
  );
}

export default Forbidden;
