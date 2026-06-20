import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDeviceId,
  getDeviceInfo,
  loadDeviceHistory,
  saveDeviceHistory,
  loadUserNames,
  saveUserNames,
  upsertDevice,
  removeDevice,
  renameDevice,
  formatTime,
} from "./deviceUtils";

export default function DeviceHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    const deviceId = getDeviceId();
    const deviceInfo = getDeviceInfo();
    const currentHistory = upsertDevice(loadDeviceHistory(), deviceId, deviceInfo);
    saveDeviceHistory(currentHistory);
    setHistory(currentHistory);
    setUserNames(loadUserNames());
  }, []);

  const handleRemove = (deviceId) => {
    const updated = removeDevice(history, deviceId);
    saveDeviceHistory(updated);
    setHistory(updated);
  };

  const startRename = (deviceId, currentName) => {
    setEditingId(deviceId);
    setEditName(currentName || "");
  };

  const saveRename = (deviceId) => {
    const { updatedHistory, updatedNames } = renameDevice(history, userNames, deviceId, editName);
    setHistory(updatedHistory);
    setUserNames(updatedNames);
    setEditingId(null);
    setEditName("");
  };

  const openBuilder = () => {
    navigate("/builder");
  };

  const getDisplayName = (device) => {
    if (device.userName) return device.userName;
    const customName = userNames[device.deviceId];
    if (customName) return customName;
    return "Unnamed Device";
  };

  const isCurrentDevice = (deviceId) => deviceId === getDeviceId();

  return (
    <div className="device-history-page">
      <div className="device-history-brand">
        <div className="device-history-logo">
          <img src="/Essarfab%20logo.png" alt="ESSARFAB GREEN INDIA" />
        </div>
        <h1>Device History</h1>
        <p>Manage your authorized devices for the 3D Builder</p>
      </div>

      <div className="device-history-content">
        {history.length === 0 ? (
          <div className="no-devices">
            <i className="fas fa-desktop"></i>
            <p>No devices registered yet.</p>
          </div>
        ) : (
          <div className="device-cards">
            {history.map((device) => (
              <div
                key={device.deviceId}
                className={`device-card ${isCurrentDevice(device.deviceId) ? "current" : ""}`}
              >
                <div className="device-card-header">
                  <div className="device-icon">
                    <i className={`fas ${device.deviceType === "Mobile" ? "fa-mobile-alt" : device.deviceType === "Tablet" ? "fa-tablet-alt" : "fa-desktop"}`}></i>
                  </div>
                  <div className="device-info">
                    {editingId === device.deviceId ? (
                      <div className="rename-row">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Enter device name"
                          autoFocus
                        />
                        <button className="btn-save" onClick={() => saveRename(device.deviceId)}>Save</button>
                        <button className="btn-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div className="device-name-row">
                        <h3>{getDisplayName(device)}</h3>
                        {isCurrentDevice(device.deviceId) && <span className="current-badge">Current</span>}
                      </div>
                    )}
                    <div className="device-meta">
                      <span><i className="fas fa-globe"></i> {device.browser}</span>
                      <span><i className="fas fa-tv"></i> {device.deviceType}</span>
                    </div>
                    <div className="device-time">
                      <i className="fas fa-clock"></i> Last login: {formatTime(device.lastLogin)}
                    </div>
                  </div>
                </div>
                <div className="device-card-actions">
                  {editingId !== device.deviceId && (
                    <button className="btn-rename" onClick={() => startRename(device.deviceId, getDisplayName(device))}>
                      <i className="fas fa-pen"></i> Rename
                    </button>
                  )}
                  <button className="btn-remove" onClick={() => handleRemove(device.deviceId)}>
                    <i className="fas fa-minus"></i> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="device-history-footer">
        <button className="btn-open-builder" onClick={openBuilder}>
          <i className="fas fa-cube"></i> Open 3D Builder
        </button>
      </div>
    </div>
  );
}