import React from "react";
import { FaExclamationCircle, FaCheckCircle, FaInfoCircle } from "react-icons/fa";
import "./Notification.css"; // optional styling

const Notification = ({ notifications }) => {
  if (!notifications || notifications.length === 0) {
    return null; // nothing to show
  }

  return (
    <div className="notification-container">
      <h3>Notifications</h3>
      <ul>
        {notifications.map((note, idx) => (
          <li key={idx} className={`notification ${note.type}`}>
            <span className="icon">
              {note.type === "warning" && <FaExclamationCircle color="#f39c12" />}
              {note.type === "success" && <FaCheckCircle color="#27ae60" />}
              {note.type === "info" && <FaInfoCircle color="#3498db" />}
            </span>
            <div>
              <p className="title">{note.title}</p>
              <p className="message">{note.message}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Notification;
