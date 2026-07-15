import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthChange } from "./services/authService";
import { subscribeToDevices, renameDevice, removeDevice } from "./services/userService";

export default function DeviceHistory() {
  const [devices, setDevices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      if (!u) {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToDevices((list, error) => {
      if (error) {
        console.error("Device history error:", error);
      }
      setDevices(list);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const handleRename = async (deviceId) => {
    if (!editName.trim()) return;
    try {
      await renameDevice(deviceId, editName.trim());
      setEditingId(null);
      setEditName("");
    } catch (err) {
      alert("Failed to rename device. Please try again.");
    }
  };

  const handleDelete = async (deviceId) => {
    if (!window.confirm("Are you sure you want to remove this device?")) return;
    try {
      await removeDevice(deviceId);
    } catch (err) {
      alert("Failed to remove device. Please try again.");
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "Never";
    const d = new Date(isoString);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (!user) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className="device-history-page">
      <div className="admin-header">
        <div className="admin-brand">
          <h1>Device History</h1>
          <p>All devices that have accessed the 3D Builder</p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate("/")}>Back to Builder</button>
      </div>

      <div className="admin-content">
        {loading ? (
          <div className="empty-state">Loading devices...</div>
        ) : devices.length === 0 ? (
          <div className="empty-state">No devices found.</div>
        ) : (
          <div className="user-list">
            {devices.map((device, index) => (
              <div key={device.id || device.deviceId || index} className="user-item">
                {editingId === device.deviceId ? (
                  <div className="user-edit-row">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Device name"
                      autoFocus
                      style={{ flex: 1.5 }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={() => handleRename(device.deviceId)}>Save</button>
                    <button className="btn btn-outline btn-sm" onClick={() => { setEditingId(null); setEditName(""); }}>Cancel</button>
                  </div>
                ) : (
                  <div className="user-display-row">
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span className="user-id-text">{device.deviceId}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {device.userName || "Unnamed Device"}
                        <span style={{ marginLeft: '8px' }}>· {device.deviceType || "Unknown"}</span>
                        <span style={{ marginLeft: '8px' }}>· {device.browser || "Unknown"}</span>
                        {device.os ? <span style={{ marginLeft: '8px' }}>· {device.os}</span> : ""}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Last login: {formatDate(device.lastLogin)}
                      </span>
                    </div>
                    <div className="user-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => { setEditingId(device.deviceId); setEditName(device.userName || ""); }}>Rename</button>
                      <button className="btn btn-remove btn-sm" onClick={() => handleDelete(device.deviceId)}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}