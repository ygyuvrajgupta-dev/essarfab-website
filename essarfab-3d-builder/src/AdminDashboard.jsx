import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  subscribeToUsers,
  addUser,
  deleteUser,
  renameUser,
  toggleUserActive
} from "./services/userService";
import { onAuthChange, logout } from "./services/authService";
import { createUser } from "./services/authService";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [newUserId, setNewUserId] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUsername, setEditUsername] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const unsubscribeRef = useRef(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (user) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        navigate("/admin-login");
      }
    });

    if (unsubscribeRef.current) unsubscribeRef.current();
    unsubscribeRef.current = subscribeToUsers((list, error) => {
      if (error) {
        showMessage("Firebase Connection Error", "error");
      }
      setUsers(list);
      setLoading(false);
    });

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
      unsubscribe();
    };
  }, [navigate]);

  // Search filter
  useEffect(() => {
    if (!search.trim()) {
      setFilteredUsers(users);
      return;
    }
    const q = search.toLowerCase();
    setFilteredUsers(
      users.filter(u =>
        (u.userId || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.company || "").toLowerCase().includes(q)
      )
    );
  }, [search, users]);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserId.trim() || !newUsername.trim() || !newEmail.trim() || !newPassword.trim()) {
      showMessage("Please fill all fields including email and password", "error");
      return;
    }
    try {
      await createUser(newEmail.trim(), newPassword);
      await addUser(newUserId.trim(), newUsername.trim(), newEmail.trim(), newCompany.trim());
      showMessage("User Created Successfully", "success");
      setNewUserId("");
      setNewUsername("");
      setNewEmail("");
      setNewCompany("");
      setNewPassword("");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        showMessage("Email already in use", "error");
      } else if (err.code === "auth/invalid-email") {
        showMessage("Invalid email format", "error");
      } else if (err.code === "auth/weak-password") {
        showMessage("Password should be at least 6 characters", "error");
      } else if (err.message === "User already exists") {
        showMessage("User ID already exists", "error");
      } else {
        showMessage("Failed to create user", "error");
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(`Are you sure you want to remove user "${userId}"?`)) return;
    try {
      await deleteUser(userId);
      showMessage("User Deleted Successfully", "success");
    } catch (err) {
      showMessage("Firebase Connection Error", "error");
    }
  };

  const handleRenameUser = async () => {
    if (!editUsername.trim()) return;
    try {
      await renameUser(editingUserId, editUsername.trim());
      showMessage("Username Updated Successfully", "success");
      setEditingUserId(null);
      setEditUsername("");
    } catch (err) {
      showMessage("Firebase Connection Error", "error");
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await toggleUserActive(user.userId, user.active);
      showMessage(user.active ? "User Disabled" : "User Enabled", "success");
    } catch (err) {
      showMessage("Firebase Connection Error", "error");
    }
  };

  const startEdit = (user) => {
    setEditingUserId(user.userId);
    setEditUsername(user.username);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditUsername("");
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      showMessage("Logout failed", "error");
    }
  };

  if (!isAdmin) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className="admin-dashboard-page">
      <div className="admin-header">
        <div className="admin-brand">
          <h1>ESSARFAB ADMIN PANEL</h1>
          <p>Manage Users for 3D Builder Access</p>
        </div>
        <button className="btn btn-outline" onClick={handleLogout}>Logout</button>
      </div>

      <div className="admin-content">
        {message.text && (
          <div className={`message-box ${message.type}`}>
            {message.type === "success" ? "✅" : "⚠️"} {message.text}
          </div>
        )}

        <div className="admin-section">
          <h3>Add New User</h3>
          <form onSubmit={handleAddUser} className="add-user-form">
            <input
              type="text"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              placeholder="User ID (e.g., sales001)"
              required
              style={{ flex: 1 }}
            />
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Username (e.g., Rahul Gupta)"
              required
              style={{ flex: 1.5 }}
            />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email"
              required
              style={{ flex: 1.5 }}
            />
            <input
              type="text"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              placeholder="Company (optional)"
              style={{ flex: 1 }}
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Password"
              required
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary">Add User</button>
          </form>
        </div>

        <div className="admin-section">
          <div className="admin-section-header">
            <h3>Authorized Users ({filteredUsers.length})</h3>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search users..."
              className="search-input"
              style={{ width: "200px", padding: "6px 10px", fontSize: "13px" }}
            />
          </div>

          {loading ? (
            <div className="empty-state">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="empty-state">
              {search.trim() ? "No users match your search." : "No users created yet. Add one above."}
            </div>
          ) : (
            <div className="user-list">
              {filteredUsers.map((user, index) => (
                <div key={user.id || user.userId || index} className="user-item">
                  {editingUserId === user.userId ? (
                    <div className="user-edit-row">
                      <span className="user-id-text" style={{ minWidth: "100px" }}>{user.userId}</span>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        placeholder="Username"
                        autoFocus
                        style={{ flex: 1.5 }}
                      />
                      <button className="btn btn-primary btn-sm" onClick={handleRenameUser}>Save</button>
                      <button className="btn btn-outline btn-sm" onClick={cancelEdit}>Cancel</button>
                    </div>
                  ) : (
                    <div className="user-display-row">
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span className="user-id-text">{user.userId}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {user.username}
                          {user.active === false && <span style={{ color: '#e53935', marginLeft: '8px' }}>(Inactive)</span>}
                          {user.company ? <span style={{ marginLeft: '8px' }}> · {user.company}</span> : ""}
                          {user.email ? <span style={{ marginLeft: '8px' }}> · {user.email}</span> : ""}
                        </span>
                      </div>
                      <div className="user-actions">
                        <button
                          className={`btn btn-sm ${user.active === false ? "btn-primary" : "btn-outline"}`}
                          onClick={() => handleToggleActive(user)}
                          title={user.active === false ? "Enable User" : "Disable User"}
                        >
                          {user.active === false ? "Enable" : "Disable"}
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => startEdit(user)}>Rename</button>
                        <button className="btn btn-remove btn-sm" onClick={() => handleDeleteUser(user.userId)}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}